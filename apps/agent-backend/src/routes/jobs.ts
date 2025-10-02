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
      fastify.log.info({ negotiationId: negotiation.id }, 'Received start-negotiation job.');

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
      await sendEmail({
        to: negotiation.counterparty_email,
        from: `SolSignAI Agent <agent@negotiate.solsignai.com>`,
        subject: `Action Required: Document Negotiation for "${document.name}"`,
        html: `...`, // Your HTML content here
        headers: { 'Reply-To': uniqueReplyToAddress },
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