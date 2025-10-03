import { FastifyPluginAsync } from 'fastify';
import { sendEmail } from '../services/email-service.js';

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

      // Fetch document details from Supabase
      const { data: document, error: docError } = await fastify.supabase
        .from('documents')
        .select('name')
        .eq('id', negotiation.document_id)
        .single();

      if (docError || !document) {
        throw new Error(`Document not found for negotiation ${negotiation.id}`);
      }

      // Send the "First Contact" email
      const uniqueReplyToAddress = `neg-${negotiation.id}@negotiate.solsignai.com`;
      const instructions = negotiation.parameters?.instructions || 'Review and negotiate the terms of this document';
      
      fastify.log.info({ 
        instructions,
        parametersObject: negotiation.parameters,
        hasInstructions: !!negotiation.parameters?.instructions 
      }, 'Extracted instructions for email.');
      
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
            .parameters { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🤖 AI Contract Negotiation</h1>
              <p>You've been invited to negotiate a document</p>
            </div>
            <div class="content">
              <h2>Document: ${document.name}</h2>
              
              <p>Hello,</p>
              
              <p>You have been invited to negotiate the terms of <strong>"${document.name}"</strong>. An AI agent has been assigned to facilitate this negotiation on behalf of the document owner.</p>
              
              <div class="parameters">
                <strong>Negotiation Parameters:</strong>
                <p>${instructions}</p>
              </div>
              
              <p><strong>How to proceed:</strong></p>
              <ol>
                <li>Review the negotiation parameters above</li>
                <li>Reply directly to this email with your response, questions, or counter-proposals</li>
                <li>The AI agent will respond within minutes to facilitate the negotiation</li>
                <li>Continue the conversation via email until terms are agreed upon</li>
              </ol>
              
              <p><strong>Simply reply to this email to start the negotiation.</strong></p>
              
              <div class="footer">
                <p>This is an automated AI-powered negotiation system by SolSign.</p>
                <p>Negotiation ID: ${negotiation.id}</p>
                <p>Reply-To: ${uniqueReplyToAddress}</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
      
      await sendEmail({
        to: negotiation.counterparty_email,
        from: `SolSignAI Agent <agent@solsignai.com>`,
        subject: `Action Required: Document Negotiation for "${document.name}"`,
        html: emailHtml,
        replyTo: uniqueReplyToAddress,
      });

      // Update negotiation status and history
      const updatedHistory = [
        ...negotiation.history,
        {
          role: 'agent',
          content: 'Sent initial contact email to counterparty.',
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