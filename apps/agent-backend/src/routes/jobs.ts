import { FastifyPluginAsync } from 'fastify';
import { sendEmail } from '../services/email-service.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const jobRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/start-negotiation', async (request, reply) => {
    try {
      // Security: Verify the request is from our trusted Supabase webhook
      if (request.headers.authorization !== `Bearer ${process.env.SUPABASE_WEBHOOK_SECRET}`) {
        fastify.log.warn('Invalid or missing secret for Supabase webhook.');
        return reply.code(403).send({ error: 'Forbidden.' });
      }

      const { record: negotiation } = request.body as any;
      fastify.log.info({ 
        negotiationId: negotiation.id,
        parameters: negotiation.parameters,
        parametersType: typeof negotiation.parameters
      }, 'Received start-negotiation job.');

      // Fetch document details from Supabase (including template for more context)
      const { data: document, error: docError } = await fastify.supabase
        .from('documents')
        .select('name, content, template:templates(*)')
        .eq('id', negotiation.document_id)
        .single();

      if (docError || !document) {
        throw new Error(`Document not found for negotiation ${negotiation.id}`);
      }

      const uniqueReplyToAddress = `neg-${negotiation.id}@negotiate.solsignai.com`;
      const instructions = negotiation.parameters?.instructions || 'Review and negotiate the terms of this document';
      
      // Build the document view URL
      const appBaseUrl = process.env.APP_BASE_URL || 'https://solsignai.com';
      const documentViewUrl = `${appBaseUrl}/documents/${negotiation.document_id}`;
      
      fastify.log.info({ 
        instructions,
        parametersObject: negotiation.parameters,
        hasInstructions: !!negotiation.parameters?.instructions,
        documentViewUrl
      }, 'Extracted instructions for email.');
      
      // Extract document context for AI - get more details
      let documentSummary = '';
      const template = (document as any).template;
      
      if (template?.extracted_data_json) {
        // Extract key information from template
        const fields = template.extracted_data_json.fields || [];
        const clauses = template.extracted_data_json.clauses || [];
        
        const fieldLabels = fields.slice(0, 5).map((f: any) => f.label).join(', ');
        const clauseTypes = clauses.slice(0, 3).map((c: any) => c.type).join(', ');
        
        documentSummary = `Template-based document. Key fields include: ${fieldLabels}. Key clauses: ${clauseTypes}.`;
      } else if (document.content) {
        // Use first 300 chars of content
        documentSummary = document.content.substring(0, 300).replace(/\n/g, ' ').trim() + '...';
      } else {
        documentSummary = 'A legal agreement document.';
      }
      
      // Use AI to draft a strategic opening message (don't reveal all parameters)
      const draftPrompt = `
You are an AI contract negotiation agent working on behalf of a client.

Document being negotiated: "${document.name}"

Document details/context: ${documentSummary}

Your client's INTERNAL parameters (DO NOT reveal these directly): ${instructions}

Write a SHORT, direct email message (3-4 short paragraphs max) that:
1. States the recipient has been invited to review and negotiate terms for the document
2. Provides a BRIEF 1-2 sentence summary of what the document is about (based on the document details above) - this helps them understand the context
3. Mentions the general CATEGORIES of terms that need discussion (e.g., "pricing and payment terms", "timeline and deliverables", "scope and responsibilities") WITHOUT revealing specific numbers or constraints from the internal parameters
4. Invites them to review the full document and share their initial proposal
5. Signs off as "SolSign AI Agent"

CRITICAL RULES:
- Do NOT use placeholders like [Name], [Counterparty Name], [Your Name], etc.
- Do NOT reveal specific numbers, amounts, dates, or deadlines from the internal parameters
- DO include a brief summary of what the document is about (1-2 sentences) so they have context
- Keep it SHORT and conversational (like a quick email, not a formal letter)
- Do NOT include "Dear [Name]" or any greeting with placeholders
- Just start with "Hello," or "Hi," and keep it simple
- Sign off with "Best regards,\nSolSign AI Agent"
- Do NOT include the document link (that's added separately)

Write the email body in plain HTML with <p> tags. Be brief and natural.
`.trim();

      fastify.log.info({ draftPrompt }, 'Requesting AI to draft opening message');
      
      let aiDraftedMessage: string;
      
      try {
        const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
          .getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent(draftPrompt);
        aiDraftedMessage = result.response.text().trim();
        
        // Remove any remaining placeholders if AI still added them
        aiDraftedMessage = aiDraftedMessage
          .replace(/\[.*?\]/g, '') // Remove [placeholders]
          .replace(/Dear\s*,/gi, 'Hello,') // Fix "Dear ,"
          .replace(/Sincerely,\s*$/gi, 'Best regards,\nSolSign AI Agent');
        
        fastify.log.info({ 
          aiDraftedMessageLength: aiDraftedMessage.length 
        }, 'AI drafted opening message');
      } catch (aiError) {
        fastify.log.warn({ error: aiError }, 'AI drafting failed, using template fallback');
        
        // Simple template fallback with document summary
        const summaryForEmail = documentSummary.length > 200 
          ? documentSummary.substring(0, 200) + '...' 
          : documentSummary;
        
        aiDraftedMessage = `
          <p>Hello,</p>
          <p>You have been invited to review and negotiate the terms for <strong>${document.name}</strong>.</p>
          <p><strong>About this document:</strong> ${summaryForEmail}</p>
          <p>Please review the full document using the link below and share your initial thoughts or proposal. We're looking forward to reaching an agreement that works for both parties.</p>
          <p>Best regards,<br>SolSign AI Agent</p>
        `;
      }
      
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .message { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .document-link { background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; font-weight: bold; }
            .document-link:hover { background: #5568d3; }
            .document-box { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; }
            .document-info { background: #f0f4ff; padding: 15px; border-radius: 5px; margin: 20px 0; font-size: 14px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🤖 AI Contract Negotiation</h1>
              <p>Document: <strong>${document.name}</strong></p>
            </div>
            <div class="content">
              <div class="message">
                ${aiDraftedMessage}
              </div>
              
              ${template?.extracted_data_json ? `
              <div class="document-info">
                <p><strong>📋 Document Overview:</strong></p>
                ${template.extracted_data_json.fields?.length > 0 ? `
                  <p><strong>Key Information Required:</strong> ${template.extracted_data_json.fields.slice(0, 5).map((f: any) => f.label).join(', ')}${template.extracted_data_json.fields.length > 5 ? ` and ${template.extracted_data_json.fields.length - 5} more` : ''}</p>
                ` : ''}
                ${template.extracted_data_json.clauses?.length > 0 ? `
                  <p><strong>Main Clauses:</strong> ${template.extracted_data_json.clauses.slice(0, 3).map((c: any) => c.type).join(', ')}${template.extracted_data_json.clauses.length > 3 ? ` and ${template.extracted_data_json.clauses.length - 3} more` : ''}</p>
                ` : ''}
              </div>
              ` : ''}
              
              <div class="document-box">
                <p><strong>📄 Document to Review:</strong></p>
                <p>${document.name}</p>
                <a href="${documentViewUrl}" class="document-link" target="_blank">
                  View Document →
                </a>
                <p style="font-size: 12px; color: #666; margin-top: 10px;">
                  Click the button above to review the full document before responding.
                </p>
              </div>
              
              <p><strong>💬 How to Proceed:</strong></p>
              <ol>
                <li>Review the document using the link above</li>
                <li>Reply to this email with your thoughts, questions, or proposals</li>
                <li>An AI agent will respond within minutes to facilitate the negotiation</li>
                <li>Continue the conversation via email until we reach an agreement</li>
              </ol>
              
              <p><strong>Simply reply to this email to continue the conversation.</strong></p>
              
              <div class="footer">
                <p>This is an AI-powered negotiation system by SolSign.</p>
                <p>Negotiation ID: ${negotiation.id}</p>
                <p>Document Link: ${documentViewUrl}</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
      
      await sendEmail({
        to: negotiation.counterparty_email,
        from: `SolSignAI Agent <agent@negotiate.solsignai.com>`,
        subject: `Action Required: Document Negotiation for "${document.name}"`,
        html: emailHtml,
        replyTo: uniqueReplyToAddress,
      });

      // Update negotiation status and history
      const updatedHistory = [
        ...negotiation.history,
        {
          role: 'agent',
          content: aiDraftedMessage,
          timestamp: new Date().toISOString(),
        }
      ];
      await fastify.supabase
        .from('negotiations')
        .update({ status: 'in_progress', history: updatedHistory })
        .eq('id', negotiation.id);

      return reply.code(200).send({ success: true });
    } catch (error) {
      fastify.log.error({ error }, 'Error in /start-negotiation job');
      return reply.code(500).send({ error: 'Internal error.' });
    }
  });
};

export default jobRoutes;