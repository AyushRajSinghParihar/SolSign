import { t } from './context'
import { authRouter } from './routers/auth'
import { vaultRouter } from './routers/vault'
import { templatesRouter } from './routers/templates'
export const appRouter = t.router({
  auth: authRouter,
  vault: vaultRouter,
  templates: templatesRouter,
})

export type AppRouter = typeof appRouter