import 'dotenv/config';
import Fastify from 'fastify';
import { createClient } from '@supabase/supabase-js';
import { logger } from './config/logger.js';
import healthRoutes from './routes/health.js';
import webhookRoutes from './routes/webhooks.js';
import jobRoutes from './routes/jobs.js';

// Validate required environment variables at startup
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SENDGRID_API_KEY',
  'GEMINI_API_KEY',
  'INBOUND_PARSE_SECRET',
  'SUPABASE_WEBHOOK_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  logger.error({ missingEnvVars }, 'Missing required environment variables');
  process.exit(1);
}

logger.info({
  env: {
    SUPABASE_URL: process.env.SUPABASE_URL,
    VERIFIED_FROM_EMAIL: process.env.VERIFIED_FROM_EMAIL || 'no-reply@negotiate.solsignai.com',
    VERIFIED_FROM_NAME: process.env.VERIFIED_FROM_NAME || 'SolSignAI Agent',
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || '3002'
  }
}, 'Environment validated successfully');

const fastify = Fastify({
  logger: logger,
  bodyLimit: 10485760, // 10MB for email attachments
  trustProxy: true
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

fastify.decorate('supabase', supabase);

await fastify.register(healthRoutes);
await fastify.register(webhookRoutes, { prefix: '/webhooks' });
await fastify.register(jobRoutes, { prefix: '/jobs' });

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3002'); // Use a different default port
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();