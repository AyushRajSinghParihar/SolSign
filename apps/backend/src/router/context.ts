import { initTRPC, TRPCError } from "@trpc/server";
import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

interface UserPayload {
  sub: string;
  role: string;
  app_metadata: {
    wallet_address: string;
  };
}

/**
 * Creates context for an incoming request
 * @link https://trpc.io/docs/v11/context
 */
export function createContext({ req, res }: CreateFastifyContextOptions) {
  function getUserFromHeader() {
    if (req.headers.authorization) {
      const token = req.headers.authorization.split(" ")[1];
      console.log("🔑 Backend received token:", token);

      if (!token) {
        console.log('❌ No token found after "Bearer ".');
        return null;
      }

      try {
        const decoded = jwt.verify(
          token,
          process.env.SUPABASE_JWT_SECRET!
        ) as UserPayload;
        if (!decoded.sub || !decoded.app_metadata?.wallet_address) {
          console.error(
            "❌ JWT is valid but missing required fields (sub or wallet_address).",
            decoded
          );
          return null;
        }
        console.log(
          "✅ Backend successfully verified token for user:",
          decoded.sub
        );
        return { decoded, token }; // Return both decoded payload AND token
      } catch (error: any) {
        console.error("❌ Backend JWT verification failed:", error.message);
        return null;
      }
    }
    console.log("🤷 No authorization header found on request.");
    return null;
  }

  const authResult = getUserFromHeader();
  const user = authResult?.decoded || null;
  
  // Create a Supabase client with the user's JWT token (enforces RLS)
  let supabase = null;
  if (authResult?.token) {
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${authResult.token}`,
          },
        },
      }
    );
  }

  return { req, res, user, supabase };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

export const t = initTRPC.context<Context>().create();

/**
 * A middleware to protect routes.
 * It ensures that a user is authenticated before proceeding.
 */
const isAuthed = t.middleware(({ next, ctx }) => {
  if (!ctx.user?.sub || !ctx.supabase) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      // Infers `user` and `supabase` as non-nullable
      user: ctx.user,
      supabase: ctx.supabase,
    },
  });
});

// Protected procedure
export const protectedProcedure = t.procedure.use(isAuthed);