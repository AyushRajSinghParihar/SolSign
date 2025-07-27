import { t } from "./context";
import { authRouter } from "./routers/auth";
import { vaultRouter } from "./routers/vault";
import { templatesRouter } from "./routers/templates";
import { documentsRouter } from "./routers/documents";

export const appRouter = t.router({
  auth: authRouter,
  vault: vaultRouter,
  templates: templatesRouter,
  documents: documentsRouter,
});

export type AppRouter = typeof appRouter;
