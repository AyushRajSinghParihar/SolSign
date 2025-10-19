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
      
      // Use AI to draft a strategic opening message with reworded negotiation terms
      const draftPrompt = `
You are an AI negotiation assistant helping facilitate a business discussion.

Document: "${document.name}"
Context: ${documentSummary}

The document owner's negotiation preferences: ${instructions}

Write a friendly, professional email (4-5 paragraphs) that:
1. Briefly introduces the negotiation (mention it's AI-assisted)
2. Provides 1-2 sentences about what the document is
3. **IMPORTANT**: Rewrites the owner's negotiation preferences in natural, specific language
   - DO include specific numbers, timelines, or terms if provided
   - Reword them to sound conversational (e.g., "looking for around $X" not just "$X")
   - Frame them as discussion points, not demands
4. Links to the document for review
5. Invites them to share their thoughts

Tone: Semi-casual business email (friendly but professional)
Format: Plain HTML paragraphs (<p> tags)
Start with: "Hi," or "Hello,"
Sign off: "Looking forward to your thoughts,\nSolSign AI Agent"

Do NOT use placeholders like [Name] or [Company].
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
          .replace(/Sincerely,\s*$/gi, 'Looking forward to your thoughts,\nSolSign AI Agent');
        
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
          <p>Hi,</p>
          <p>You've been invited to review and negotiate <strong>${document.name}</strong>. This is an AI-assisted negotiation on behalf of the document owner.</p>
          <p><strong>About this document:</strong> ${summaryForEmail}</p>
          <p>Please take a look at the document linked below. I'd love to hear your thoughts on the terms and see if we can reach an agreement that works for everyone.</p>
          <p>Looking forward to your thoughts,<br>SolSign AI Agent</p>
        `;
      }
      
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .message { margin: 20px 0; }
            .document-link { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
            .document-link:hover { background: #5568d3; }
            .note { font-size: 13px; color: #666; margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="message">
            ${aiDraftedMessage}
          </div>
          
          <p><strong>Document to Review:</strong><br>
          ${document.name}</p>
          
          <a href="${documentViewUrl}" class="document-link" target="_blank">View Document</a>
          
          <p>Please review the document and reply to this email with your thoughts or any questions you have. I'll respond promptly to keep the conversation moving.</p>
          
          <div class="note">
            <p><em>Note: This is an automated negotiation system powered by SolSign AI. All responses are handled by an AI agent on behalf of the document owner.</em></p>
            <p style="font-size: 12px;">Negotiation ID: ${negotiation.id}</p>
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