import { FastifyPluginAsync } from 'fastify';
import multipart from '@fastify/multipart';

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

      // 2. Log the raw payload for debugging
      const emailData = request.body as any;
      fastify.log.info({ from: emailData.from?.value, subject: emailData.subject?.value }, 'Processing inbound email...');
      // For deep debugging: console.log(emailData);

      // 3. Extract the Negotiation ID from the 'to' address
      // The 'to' address will be something like: "SolSignAI Agent <neg-c99ffd93-72fe-4768-9c10-434946aee638@negotiate.solsignai.com>"
      const toAddress = emailData.to?.value || '';
      const match = toAddress.match(/neg-([a-f0-9-]+)@/);
      const negotiationId = match ? match[1] : null;

      if (!negotiationId) {
        fastify.log.error({ toAddress }, 'Could not parse negotiation ID from "to" address.');
        // Return 200 OK to prevent SendGrid from retrying. This is a "dead letter".
        return reply.code(200).send({ success: true, message: "Ignored: Could not identify negotiation." });
      }

      // 4. Append the email to the correct negotiation's history (Week 4 Logic)
      fastify.log.info(`Email successfully routed to negotiation ID: ${negotiationId}`);
      
      // In Week 4, we will add:
      // - A query to fetch the negotiation by its ID.
      // - Logic to append the email content to its `history` array.
      // - A call to Gemini to decide the next step.

      // 5. Acknowledge receipt
      return reply.code(200).send({ success: true, message: "Webhook processed." });

    } catch (error) {
      fastify.log.error({ error }, 'Webhook handler processing error');
      return reply.code(500).send({ error: 'Internal error.' });
    }
  });
};

export default webhookRoutes;