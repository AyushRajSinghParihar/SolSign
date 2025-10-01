import 'dotenv/config';
import Fastify from 'fastify';
import { createClient } from '@supabase/supabase-js';
import { logger } from './config/logger.js';
import healthRoutes from './routes/health.js';
import webhookRoutes from './routes/webhooks.js';

const fastify = Fastify({
  logger: logger,
  bodyLimit: 10485760, // 10MB for email attachments
  trustProxy: true
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

fastify.decorate('supabase', supabase);

await fastify.register(healthRoutes);
await fastify.register(webhookRoutes, { prefix: '/webhooks' });

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001'); // Use a different default port
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();