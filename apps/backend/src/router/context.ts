import { initTRPC } from '@trpc/server'
import { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify'

export function createContext({ req, res }: CreateFastifyContextOptions) {
  // For now, we're not adding anything to the context
  // but this is where you would add user auth state, etc.
  return { req, res }
}

export type Context = Awaited<ReturnType<typeof createContext>>

export const t = initTRPC.context<Context>().create()
