import Fastify from "fastify";
import cors from "@fastify/cors";
import { fastifyTRPCPlugin } from "@trpc/server/adapters/fastify";
import { appRouter } from "./router";
import { createContext } from "./router/context";

const server = Fastify({
  logger: true,
});

server.register(cors, {
  origin: "*", // In production, lock this down to your Vercel URL
});

server.register(fastifyTRPCPlugin, {
  prefix: "/trpc",
  trpcOptions: { router: appRouter, createContext },
});

const PORT = parseInt(process.env.PORT || "3001", 10);

const start = async () => {
  try {
    await server.listen({ port: PORT, host: "0.0.0.0" });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
