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
    // @ts-ignore - Type compatibility issue between Fastify versions
    await server.register(cors, {
      origin: "*", // In production, lock this down to your Vercel URL
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
