import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";

export async function buildApp(options?: { logger?: boolean }): Promise<FastifyInstance> {
  const app = Fastify({ logger: options?.logger ?? false });

  await app.register(cors, { origin: true });

  app.get("/health", async () => ({
    ok: true,
    service: "mente-colectiva",
  }));

  return app;
}
