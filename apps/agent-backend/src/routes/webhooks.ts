import { FastifyPluginAsync } from 'fastify';
import multipart from '@fastify/multipart';
import { GoogleGenerativeAI } from '@google/generative-ai'
import { sendEmail } from '../services/email-service.js';

const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  // Register multipart to handle the form-data payload from SendGrid
  await fastify.register(multipart, { attachFieldsToBody: true });

  fastify.post('/email-inbound', async (request, reply) => {
    try {
      // 1. Authenticate the request using the URL secret
      const { secret } = request.query as { secret: string };
      if (secret !== process.env.INBOUND_PARSE_SECRET) {
        fastify.log.warn('Invalid or missing secret for Inbound Parse webhook.');
        return reply.code(403).send({ error: 'Forbidden.' });
      }

      const emailData = request.body as any;
      fastify.log.info({ from: emailData.from?.value, subject: emailData.subject?.value }, 'Processing inbound email...');

      // 2. Extract the Negotiation ID from the 'to' address
      const toAddress = emailData.to?.value || '';
      const match = toAddress.match(/neg-([a-f0-9-]+)@/);
      const negotiationId = match ? match[1] : null;

      if (!negotiationId) {
        fastify.log.error({ toAddress }, 'Could not parse negotiation ID from "to" address.');
        return reply.code(200).send({ success: true, message: "Ignored: Could not identify negotiation." });
      }
      fastify.log.info(`Email successfully routed to negotiation ID: ${negotiationId}`);

      // 3. Fetch the full negotiation record from the database
      const { data: negotiation, error: negError } = await fastify.supabase
        .from('negotiations')
        .select('*, owner:users(email)') // Also fetch the owner's email for escalations
        .eq('id', negotiationId)
        .single();

      if (negError || !negotiation) {
        throw new Error(`Negotiation ${negotiationId} not found. Error: ${negError?.message}`);
      }

      // 4. Append the new inbound email to the history
      const newHistoryEntry = {
        role: 'counterparty',
        content: emailData.text?.value || emailData.html?.value || '',
        timestamp: new Date().toISOString(),
      };
      const updatedHistory = [...negotiation.history, newHistoryEntry];
      await fastify.supabase.from('negotiations').update({ history: updatedHistory }).eq('id', negotiationId);

      // 5. Construct the Gemini Prompt
      const geminiPrompt = `
        You are an AI contract negotiation agent.
        Your user's goals are: ${JSON.stringify(negotiation.parameters)}
        The full conversation history is: ${JSON.stringify(updatedHistory)}
        The latest message from the counterparty is: "${newHistoryEntry.content}"

        Analyze the latest message in the context of the user's goals and the entire conversation.
        Decide the next action. Your possible actions are: ACCEPT, COUNTER-PROPOSE, or ESCALATE.
        - ACCEPT: Use if the counterparty agrees to all of the user's key terms.
        - COUNTER-PROPOSE: Use if you need to suggest a change or respond to a question.
        - ESCALATE: Use if you are unsure, the request is outside your parameters, or if the counterparty is hostile.

        You must also generate the text for the next email to send.
        Respond ONLY with a valid JSON object in the format: {"action": "ACTION_TYPE", "responseText": "The text for the next email."}
      `;
      
      // 6. Call Gemini to get the next action
      const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!).getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(geminiPrompt);
      const aiResponse = JSON.parse(result.response.text().replace(/```json\n|```/g, '').trim());
      const { action, responseText } = aiResponse;

      fastify.log.info({ negotiationId, action }, 'AI has decided on the next action.');

      // 7. Execute the Action
      let newStatus = negotiation.status;
      const uniqueReplyToAddress = `neg-${negotiation.id}@negotiate.solsignai.com`;
      const ownerEmail = (negotiation.owner as any)?.email;

      if (action === 'ACCEPT') {
        newStatus = 'agreed';
        // Send confirmation email to both parties
        await sendEmail({ to: emailData.from?.value, from: `SolSignAI Agent <agent@negotiate.solsignai.com>`, subject: `Agreement Reached`, html: responseText });
        if (ownerEmail) await sendEmail({ to: ownerEmail, from: `SolSignAI Agent <agent@negotiate.solsignai.com>`, subject: `Agreement Reached for Negotiation ${negotiation.id}`, html: `The negotiation has been successfully agreed upon. The final response was: <br/><br/>${responseText}` });
      } else if (action === 'COUNTER-PROPOSE') {
        newStatus = 'in_progress';
        // Send counter-proposal email to counterparty
        await sendEmail({ to: emailData.from?.value, from: `SolSignAI Agent <agent@negotiate.solsignai.com>`, subject: `Re: ${emailData.subject?.value}`, html: responseText, headers: { 'Reply-To': uniqueReplyToAddress } });
      } else if (action === 'ESCALATE') {
        newStatus = 'escalated';
        // Send escalation email to the original user (owner)
        if (ownerEmail) await sendEmail({ to: ownerEmail, from: `SolSignAI Agent <agent@negotiate.solsignai.com>`, subject: `Action Required: Negotiation Escalated`, html: `The negotiation requires your input. The agent's summary is: <br/><br/>${responseText}` });
      }

      // 8. Update negotiation status and history with the agent's action
      const finalHistory = [...updatedHistory, { role: 'agent', content: responseText, timestamp: new Date().toISOString() }];
      await fastify.supabase.from('negotiations').update({ status: newStatus, history: finalHistory }).eq('id', negotiationId);

      return reply.code(200).send({ success: true });
    } catch (error) {
      fastify.log.error({ error }, 'Webhook handler processing error');
      return reply.code(500).send({ error: 'Internal error.' });
    }
  });
};

export default webhookRoutes;