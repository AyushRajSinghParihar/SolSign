import Fastify from "fastify";
import cors from "@fastify/cors";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { appRouter } from "./router";
import { createContext } from "./router/context";

const server = Fastify({
  logger: true,
});

const start = async () => {
  try {
    // Configure allowed origins from environment variable
    const allowedOrigins = process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
      : ['http://localhost:5173'];

    server.log.info(`🔒 CORS configured for origins: ${allowedOrigins.join(', ')}`);

    // @ts-ignore - Type compatibility issue between Fastify versions
    await server.register(cors, {
      origin: (origin, cb) => {
        server.log.info(`🌐 CORS request from origin: ${origin || 'no-origin'}`);
        
        // Allow requests with no origin (e.g., mobile apps, curl, Postman)
        if (!origin) {
          cb(null, true);
          return;
        }

        // Check if origin is in allowed list
        if (allowedOrigins.includes(origin)) {
          server.log.info(`✅ CORS allowed for origin: ${origin}`);
          cb(null, true);
        } else {
          server.log.warn(`❌ CORS blocked for origin: ${origin}`);
          cb(new Error(`Origin ${origin} not allowed by CORS`), false);
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    // @ts-ignore - Type compatibility issue between Fastify versions
    await server.register(fastifyTRPCPlugin, {
      prefix: "/trpc",
      trpcOptions: { router: appRouter, createContext },
    });

    const PORT = parseInt(process.env.PORT || "3001", 10);

    await server.listen({ port: PORT, host: "0.0.0.0" });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
