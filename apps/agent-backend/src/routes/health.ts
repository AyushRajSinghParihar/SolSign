import { FastifyPluginAsync } from 'fastify';

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  // Root route - for Render health checks
  fastify.get('/', async (request, reply) => {
    return {
      status: 'ok',
      service: 'SolSignAI Agent Backend',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    };
  });

  // HEAD method for root route (Render uses this for health checks)
  fastify.head('/', async (request, reply) => {
    reply.code(200).send();
  });

  // Detailed health check endpoint
  fastify.get('/health', async (request, reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  });
};

export default healthRoutes;