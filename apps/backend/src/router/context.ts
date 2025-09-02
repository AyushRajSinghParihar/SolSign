import { initTRPC, TRPCError } from "@trpc/server";
import { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import jwt from "jsonwebtoken";

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
      console.log("🔑 Backend received token:", token); // <-- LOG 3

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
        ); // <-- LOG 4
        return decoded;
      } catch (error: any) {
        console.error("❌ Backend JWT verification failed:", error.message); // <-- LOG 5
        return null;
      }
    }
    console.log("🤷 No authorization header found on request."); // <-- LOG 6
    return null;
  }

  const user = getUserFromHeader();

  return { req, res, user };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

export const t = initTRPC.context<Context>().create();

/**
 * A middleware to protect routes.
 * It ensures that a user is authenticated before proceeding.
 */
const isAuthed = t.middleware(({ next, ctx }) => {
  if (!ctx.user?.sub) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      // Infers `user` as non-nullable
      user: ctx.user,
    },
  });
});

// Protected procedure
export const protectedProcedure = t.procedure.use(isAuthed);
