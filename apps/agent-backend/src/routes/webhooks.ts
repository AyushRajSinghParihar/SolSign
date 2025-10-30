// apps/agent-backend/src/routes/webhooks.ts
import { FastifyPluginAsync } from 'fastify';
import multipart from '@fastify/multipart';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { sendEmail } from '../services/email-service.js';
import { createClient } from '@supabase/supabase-js';

const VERIFIED_FROM_ADDRESS = process.env.VERIFIED_FROM_EMAIL || 'no-reply@negotiate.solsignai.com';
const VERIFIED_FROM_NAME = process.env.VERIFIED_FROM_NAME || 'SolSignAI Agent';
const VERIFIED_FROM_FULL = `${VERIFIED_FROM_NAME} <${VERIFIED_FROM_ADDRESS}>`;


type AnyObj = Record<string, any>;

function truncate(str: string, max = 2000) {
  if (!str) return '';
  return str.length > max ? `${str.slice(0, max)}…[truncated ${str.length - max}]` : str;
}

function durationMs(start: number) {
  return Math.round(performance.now() - start);
}

// Extract email address from "Name <email@domain.com>" or just "email@domain.com"
function extractEmailAddress(emailString: string): string {
  if (!emailString) return '';
  
  // Match email in angle brackets: "Name <email@domain.com>"
  const bracketMatch = emailString.match(/<([^>]+)>/);
  if (bracketMatch) {
    return bracketMatch[1].trim();
  }
  
  // If no brackets, check if it's already just an email
  const emailMatch = emailString.match(/[\w.+-]+@[\w.-]+\.\w+/);
  if (emailMatch) {
    return emailMatch[0].trim();
  }
  
  // Fallback: return original
  return emailString.trim();
}

const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  // Local error hook: logs after error handler if an error is sent to user
  fastify.addHook('onError', async (request, reply, error) => {
    const log = request.log.child({ route: 'email-inbound', hook: 'onError', reqId: request.id });
    log.error({
      err: { msg: error.message, stack: error.stack },
      statusCode: reply.statusCode,
    }, 'Unhandled error in webhook route');
  });

  await fastify.register(multipart, {
    attachFieldsToBody: true,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
  });

  // Validate env without logging secrets
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKeyExists = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const geminiKeyExists = Boolean(process.env.GEMINI_API_KEY);
  const inboundSecretExists = Boolean(process.env.INBOUND_PARSE_SECRET);

  // Create service role client to bypass RLS
  const supabaseServiceRole = createClient(
    supabaseUrl!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  fastify.post('/email-inbound', async (request, reply) => {
    const baseLog = request.log.child({
      route: 'email-inbound',
      reqId: request.id,
      ip: request.ip,
    });

    const started = performance.now();
    try {
      // High-level request metadata (no secrets)
      baseLog.info({
        hdr: {
          'content-type': request.headers['content-type'],
          'content-length': request.headers['content-length'],
          'user-agent': request.headers['user-agent'],
        },
        env: {
          SUPABASE_URL: Boolean(supabaseUrl),
          SUPABASE_SERVICE_ROLE_KEY_present: supabaseKeyExists,
          GEMINI_API_KEY_present: geminiKeyExists,
          INBOUND_PARSE_SECRET_present: inboundSecretExists,
        },
      }, 'Webhook request received');

      // 1) AUTH
      const authStart = performance.now();
      const { secret } = request.query as { secret?: string };
      if (!secret || secret !== process.env.INBOUND_PARSE_SECRET) {
        baseLog.warn({
          durMs: durationMs(authStart),
          providedSecret: Boolean(secret),
        }, 'Auth failed: invalid or missing secret');
        return reply.code(403).send({ error: 'Forbidden.' });
      }
      baseLog.info({ durMs: durationMs(authStart) }, 'Auth successful');

      // 2) PARSE INBOUND
      const parseStart = performance.now();
      const emailData = request.body as AnyObj;

      const fromEmail = emailData?.from?.value ?? emailData?.from ?? '';
      const subjectText = emailData?.subject?.value ?? emailData?.subject ?? '';
      const toAddress = emailData?.to?.value ?? emailData?.to ?? '';
      const textVal = emailData?.text?.value ?? emailData?.text ?? '';
      const htmlVal = emailData?.html?.value ?? emailData?.html ?? '';
      const emailText = textVal || htmlVal || '';

      baseLog.info({
        durMs: durationMs(parseStart),
        fieldsPresent: {
          from: Boolean(fromEmail),
          to: Boolean(toAddress),
          subject: Boolean(subjectText),
          textLen: typeof textVal === 'string' ? textVal.length : 0,
          htmlLen: typeof htmlVal === 'string' ? htmlVal.length : 0,
        },
      }, 'Parsed inbound multipart fields');

      // 3) EXTRACT NEGOTIATION ID
      const idStart = performance.now();
      const match = typeof toAddress === 'string' ? toAddress.match(/neg-([a-f0-9-]+)@/) : null;
      const negotiationId = match ? match[1] : null;

      if (!negotiationId) {
        baseLog.error({
          durMs: durationMs(idStart),
          toAddressSample: truncate(String(toAddress), 256),
        }, 'Could not parse negotiationId from "to" address');
        return reply.code(200).send({ success: true, message: 'Ignored: Could not identify negotiation.' });
      }

      const log = baseLog.child({ negotiationId });
      log.info({ durMs: durationMs(idStart), fromEmail, subjectText }, 'Routed to negotiation');

      // 4) FETCH NEGOTIATION
      const fetchStart = performance.now();
      const { data: negotiation, error: negError, status: negStatus } = await supabaseServiceRole
        .from('negotiations')
        .select('*, owner:users(email)')
        .eq('id', negotiationId)
        .single();

      if (negError || !negotiation) {
        log.error({
          durMs: durationMs(fetchStart),
          supabaseStatus: negStatus,
          supabaseError: negError ? {
            message: negError.message,
            details: (negError as any).details,
            hint: (negError as any).hint,
            code: (negError as any).code,
          } : null,
        }, 'Negotiation fetch failed');
        throw new Error(`Negotiation ${negotiationId} not found or inaccessible`);
      }
      const ownerEmail = (negotiation as any)?.owner?.email;
      const counterpartyEmail = negotiation.counterparty_email;
      // Build document view URL
      const appBaseUrl = process.env.APP_BASE_URL || 'https://solsignai.com';
      const documentViewUrl = `${appBaseUrl}/documents/${negotiation.document_id}`;
      log.info({
        durMs: durationMs(fetchStart),
        status: negotiation.status,
        ownerEmailPresent: Boolean(ownerEmail),
        counterpartyEmailPresent: Boolean(counterpartyEmail),
        historyCount: Array.isArray(negotiation.history) ? negotiation.history.length : 0,
      }, 'Negotiation fetched');

      // 5) APPEND HISTORY
      const histStart = performance.now();
      
      // Determine if the email is from the owner or counterparty
      // Extract clean email address for comparison
      const cleanFromEmail = extractEmailAddress(fromEmail).toLowerCase();
      const isOwnerEmail = ownerEmail && cleanFromEmail === ownerEmail.toLowerCase();
      const senderRole = isOwnerEmail ? 'owner' : 'counterparty';
      
      const newHistoryEntry = {
        role: senderRole,
        content: emailText,
        timestamp: new Date().toISOString(),
      };
      const updatedHistory = [...(negotiation.history || []), newHistoryEntry];
      
      log.info({
        fromEmail,
        cleanFromEmail,
        ownerEmail,
        isOwnerEmail,
        senderRole,
      }, 'Identified email sender');

      const { error: histError, status: histStatus } = await supabaseServiceRole
        .from('negotiations')
        .update({ history: updatedHistory })
        .eq('id', negotiationId);

      if (histError) {
        log.error({
          durMs: durationMs(histStart),
          supabaseStatus: histStatus,
          supabaseError: {
            message: histError.message,
            details: (histError as any).details,
            hint: (histError as any).hint,
            code: (histError as any).code,
          },
        }, 'Failed to update history');
        throw new Error('Failed to update negotiation history');
      }
      log.info({ durMs: durationMs(histStart) }, 'History updated');

      // 6) GEMINI DECISION 
      const llmStart = performance.now();
      // Section 6: GEMINI DECISION (Updated to be generic)
      const geminiPrompt = `

You are an AI contract negotiation agent representing the document owner.

**YOUR CLIENT (Document Owner):** ${ownerEmail || 'Document Owner'}
**COUNTERPARTY (Negotiating With):** ${counterpartyEmail || 'Counterparty'}
**YOUR ROLE:** You represent your client and negotiate on their behalf.

Your client's goals and requirements are: ${JSON.stringify(negotiation.parameters)}

The full conversation history is: 
 ${JSON.stringify(updatedHistory)}

 ${senderRole === 'owner' 
  ? `The latest message is an instruction from the owner: "${newHistoryEntry.content}"`
  : `The latest message from the counterparty is: "${newHistoryEntry.content}"`
}

**IMPORTANT**: The document being negotiated is available at: ${documentViewUrl}
If you need to reference the document or include a link in your response, use this exact URL.

Analyze the latest message in the context of the user's goals and the entire conversation.

CRITICAL: Your user has set specific parameters for this negotiation. These parameters represent their requirements and constraints. You MUST respect these parameters at all times.

 ${senderRole === 'owner'
  ? `IMPORTANT: This is an instruction from the owner (your user). Follow their guidance and respond to the counterparty accordingly. DO NOT ESCALATE back to the owner - they have already given you instructions.`
  : `This is a message from the counterparty.`
}

Decide the next action. Your possible actions are: ACCEPT, COUNTER-PROPOSE, or ESCALATE.

ACCEPT: Use ONLY if the counterparty agrees to ALL of the user's key parameters and requirements.

COUNTER-PROPOSE: Use if you need to suggest a change or respond to a question. Always maintain the user's key parameters and requirements. ${senderRole === 'owner' ? 'Use this when the owner gives you instructions on how to proceed with the counterparty.' : ''}

ESCALATE: Use ONLY if the counterparty is hostile, unwilling to meet the user's requirements, or if you're unsure how to proceed. ${senderRole === 'owner' ? 'NEVER use ESCALATE when the message is from the owner.' : ''}

You must also generate the text for the next email to send.
Respond ONLY with a valid JSON object in the format:
{"action": "ACTION_TYPE", "responseText": "The text for the next email."}
`.trim();

      const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!).getGenerativeModel({ model: 'gemini-flash-latest' });
      const result = await model.generateContent(geminiPrompt);
      const raw = result.response.text();
      // Remove markdown code blocks (```json ... ``` or ``` ... ```)
      const cleaned = raw
        .replace(/^```(?:json)?\s*/i, '')  // Remove opening ```json or ```
        .replace(/\s*```\s*$/i, '')         // Remove closing ```
        .trim();

      let aiResponse: { action: 'ACCEPT'|'COUNTER-PROPOSE'|'ESCALATE', responseText: string };
      try {
        aiResponse = JSON.parse(cleaned);
      } catch (e) {
        log.error({
          durMs: durationMs(llmStart),
          rawSample: truncate(raw, 1000),
          cleanedSample: truncate(cleaned, 1000),
          parseErr: (e as Error)?.message,
        }, 'Gemini JSON parse failed');
        throw new Error('Gemini returned non-JSON response');
      }

      const { action, responseText: emailResponseText } = aiResponse;
      
      // Ensure ACCEPT emails always include the document link
      if (action === 'ACCEPT') {
        // If AI didn't include the link, append it
        if (!emailResponseText.includes(documentViewUrl) && !emailResponseText.includes('http')) {
          aiResponse.responseText = emailResponseText + `\n\nYou can review the final document here: ${documentViewUrl}`;
        }
      }
      
      log.info({
        durMs: durationMs(llmStart),
        action,
        responseTextLen: aiResponse.responseText?.length || 0,
      }, 'Gemini decision computed');

      // 7) EXECUTE ACTION (send emails)
      const actionStart = performance.now();
      let newStatus = negotiation.status;
      const uniqueReplyToAddress = `neg-${negotiation.id}@negotiate.solsignai.com`;

      // Log the from address we're going to use
      log.info({
        verifiedFromAddress: VERIFIED_FROM_ADDRESS,
        verifiedFromName: VERIFIED_FROM_NAME,
        action,
        senderRole
      }, 'Preparing to send emails');

      // CRITICAL FIX: If the message is from the owner, never escalate back to them
      if (senderRole === 'owner' && action === 'ESCALATE') {
        log.warn({
          action,
          senderRole,
          fromEmail,
          ownerEmail
        }, 'Prevented escalation loop: Owner sent message but AI tried to escalate. Forcing COUNTER-PROPOSE instead.');
        
        // Override the action to COUNTER-PROPOSE when owner sends instructions
        aiResponse.action = 'COUNTER-PROPOSE';
        // If responseText doesn't make sense for counter-propose, generate a default
        if (!aiResponse.responseText || aiResponse.responseText.includes('escalat')) {
          aiResponse.responseText = 'Thank you for your guidance. I will proceed with the negotiation based on your instructions.';
        }
      }

      // Use the potentially modified action
      const finalAction = aiResponse.action;

      try {
        if (finalAction === 'ACCEPT') {
          newStatus = 'agreed';
          
          // Always send acceptance to counterparty
          await sendEmail({
            to: counterpartyEmail,
            from: VERIFIED_FROM_FULL,
            subject: `Agreement Reached`,
            html: emailResponseText
          });
          
          // Notify owner if they weren't the one who triggered acceptance
          if (ownerEmail && senderRole !== 'owner') {
            await sendEmail({
              to: ownerEmail,
              from: VERIFIED_FROM_FULL,
              subject: `Agreement Reached for Negotiation ${negotiation.id}`,
              html: `The negotiation has been successfully agreed upon. The final response was: <br/><br/>${emailResponseText}`
            });
          }
          
          log.info({
            senderRole,
            acceptedBy: senderRole,
            notifiedOwner: senderRole !== 'owner'
          }, 'Agreement emails sent');
        } else if (finalAction === 'COUNTER-PROPOSE') {
          newStatus = 'in_progress';
          
          // Get the potentially updated response text
          const finalResponseText = aiResponse.responseText;
          
          // CRITICAL: If sender is owner, send to counterparty. If sender is counterparty, reply to them.
          let recipientEmail = senderRole === 'owner' ? counterpartyEmail : fromEmail;
          
          // Extract clean email address (remove "Name <email>" format)
          recipientEmail = extractEmailAddress(recipientEmail);
          
          if (!recipientEmail) {
            log.error({ senderRole, fromEmail, counterpartyEmail }, 'No recipient email available for COUNTER-PROPOSE');
            throw new Error('Cannot send counter-proposal: no recipient email');
          }
          
          await sendEmail({
            to: recipientEmail,
            from: VERIFIED_FROM_FULL,
            subject: `Re: ${subjectText}`,
            html: finalResponseText,
            replyTo: uniqueReplyToAddress
          });
          
          log.info({
            senderRole,
            recipientEmail,
            sentToCounterparty: senderRole === 'owner'
          }, 'Counter-proposal email sent');
        } else if (finalAction === 'ESCALATE') {
          newStatus = 'escalated';
          
          if (ownerEmail) {
            log.info({ 
              ownerEmail,
              fromAddress: VERIFIED_FROM_ADDRESS 
            }, 'Sending escalation email to owner');
            
            await sendEmail({
              to: ownerEmail,
              from: VERIFIED_FROM_FULL,
              subject: `Action Required: Negotiation Escalated`,
              html: `The negotiation requires your input. The agent's summary is: <br/><br/>${emailResponseText}`,
              replyTo: uniqueReplyToAddress // Allow owner to reply directly to the negotiation
            });
            
            log.info('Escalation email sent successfully');
          } else {
            log.warn('ESCALATE action but no owner email found');
          }
        }
        
        log.info({
          durMs: durationMs(actionStart),
          newStatus,
          finalAction,
          ownerEmailPresent: Boolean(ownerEmail),
        }, 'Emails sent and action executed');
      } catch (mailErr) {
        log.error({
          durMs: durationMs(actionStart),
          err: { 
            msg: (mailErr as Error)?.message, 
            stack: (mailErr as Error)?.stack 
          },
          finalAction,
          attemptedFromAddress: VERIFIED_FROM_ADDRESS,
        }, 'sendEmail failed');
        
        // Don't throw - log the error but continue processing
        // The negotiation state should still be updated
        log.warn('Continuing despite email failure - negotiation will still be updated');
      }
      // 8) FINAL STATUS + HISTORY APPEND
      const finalStart = performance.now();
      // Use the potentially modified response text
      const finalResponseText = aiResponse.responseText;
      const finalHistory = [
        ...updatedHistory,
        { role: 'agent', content: finalResponseText, timestamp: new Date().toISOString() }
      ];

      const { error: finalErr, status: finalStatus } = await supabaseServiceRole
        .from('negotiations')
        .update({ status: newStatus, history: finalHistory })
        .eq('id', negotiationId);

      if (finalErr) {
        log.error({
          durMs: durationMs(finalStart),
          supabaseStatus: finalStatus,
          supabaseError: {
            message: finalErr.message,
            details: (finalErr as any).details,
            hint: (finalErr as any).hint,
            code: (finalErr as any).code,
          },
        }, 'Failed to persist final status/history');
        throw new Error('Failed to persist final status/history');
      }

      log.info({
        durMs: durationMs(finalStart),
        totalDurMs: durationMs(started),
      }, 'Webhook completed successfully');

      return reply.code(200).send({ success: true });
    } catch (error) {
      baseLog.error({
        err: { msg: (error as Error)?.message, stack: (error as Error)?.stack },
        totalDurMs: durationMs(started),
      }, 'Webhook handler processing error');
      return reply.code(500).send({
        error: 'Internal error.',
        message: (error as Error)?.message || 'Unknown error',
      });
    }
  });
};

export default webhookRoutes;
