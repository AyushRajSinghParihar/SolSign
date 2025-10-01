import { FastifyPluginAsync } from 'fastify';
import { SendGridVerifier } from '../services/sendgrid-verification.js';
import multipart from '@fastify/multipart';

const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(multipart, { attachFieldsToBody: true });

  const verifier = new SendGridVerifier();

  fastify.post('/email-inbound', {
    config: { rawBody: true },
    preHandler: async (request, reply) => {
      const signature = request.headers['x-twilio-email-event-webhook-signature'];
      const timestamp = request.headers['x-twilio-email-event-webhook-timestamp'];
      const publicKey = process.env.SENDGRID_WEBHOOK_KEY;

      if (!signature || !timestamp || !request.rawBody || !publicKey) {
        fastify.log.warn('Missing SendGrid signature headers, raw body, or public key');
        reply.code(401).send({ error: 'Unauthorized: Missing signature components.' });
        return;
      }

      try {
        const isValid = verifier.verifySignature(publicKey, request.rawBody, signature as string, timestamp as string);
        if (!isValid) {
          fastify.log.warn('Invalid SendGrid signature received.');
          reply.code(403).send({ error: 'Forbidden: Invalid signature.' });
          return;
        }
        fastify.log.info('SendGrid signature verified successfully.');
      } catch (error) {
        fastify.log.error({ error }, 'Error during signature verification');
        reply.code(500).send({ error: 'Internal error during verification.' });
        return;
      }
    },
  }, async (request, reply) => {
    try {
      const emailData = request.body as any;
      fastify.log.info({
        from: emailData.from?.value,
        to: emailData.to?.value,
        subject: emailData.subject?.value,
      }, 'Processing inbound email...');
      
      // Week 4 logic will go here.
      
      return reply.code(200).send({ success: true, message: "Webhook processed." });
    } catch (error) {
      fastify.log.error({ error }, 'Webhook handler processing error');
      return reply.code(500).send({ error: 'Internal error.' });
    }
  });
};

export default webhookRoutes;