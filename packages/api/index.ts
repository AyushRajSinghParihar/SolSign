import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import type { AppRouter as BackendAppRouter } from "../../apps/backend/src/router";

/**
 * This is the primary router type for the entire app.
 */
export type AppRouter = BackendAppRouter;

/**
 * Inference helpers for input types
 * @example type HelloInput = RouterInputs['example']['hello']
 */
export type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inference helpers for output types
 * @example type HelloOutput = RouterOutputs['example']['hello']
 */
export type RouterOutputs = inferRouterOutputs<AppRouter>;
