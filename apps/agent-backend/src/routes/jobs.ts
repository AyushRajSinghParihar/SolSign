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
      
      // Extract document context for AI
      const documentContext = (document as any).template 
        ? `This is a template-based document with fillable fields.` 
        : `This is a content-based document: ${document.content ? document.content.substring(0, 200) + '...' : 'No preview available'}`;
      
      // Use AI to draft a strategic opening message (don't reveal all parameters)
      const draftPrompt = `
You are a professional contract negotiation agent. Your client has tasked you with negotiating a document called "${document.name}".

Document context: ${documentContext}

Your client's INTERNAL goals and constraints are: ${instructions}

IMPORTANT: These are INTERNAL parameters. Do NOT reveal them directly to the counterparty. Instead, draft a professional, strategic opening email that:
1. Introduces the negotiation in a friendly, professional manner
2. Mentions that they can review the full document via the link provided
3. Expresses interest in reaching mutually beneficial terms
4. Invites the counterparty to review the document and share their initial thoughts or proposal
5. Keeps the conversation open without revealing your full hand
6. Sets a collaborative tone

The email should be conversational but professional. Do NOT include a subject line (that's handled separately). 
Do NOT reveal specific numbers, deadlines, or constraints from the internal parameters.
Do NOT include the document link in your message (it will be added separately).

Write ONLY the email body (professional HTML format with <p> tags). Start with a greeting and end professionally.
`.trim();

      fastify.log.info({ draftPrompt }, 'Requesting AI to draft opening message');
      
      const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
        .getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await model.generateContent(draftPrompt);
      const aiDraftedMessage = result.response.text().trim();
      
      fastify.log.info({ 
        aiDraftedMessageLength: aiDraftedMessage.length 
      }, 'AI drafted opening message');
      
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