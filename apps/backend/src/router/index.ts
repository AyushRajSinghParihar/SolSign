import { t } from './context'
import { authRouter } from './routers/auth'

export const appRouter = t.router({
  auth: authRouter,
})

export type AppRouter = typeof appRouter
