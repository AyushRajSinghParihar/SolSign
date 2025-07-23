import { t } from './context'
import { authRouter } from './routers/auth'
import { vaultRouter } from './routers/vault'

export const appRouter = t.router({
  auth: authRouter,
  vault: vaultRouter, 
})

export type AppRouter = typeof appRouter
