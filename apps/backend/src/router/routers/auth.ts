// [File Begins] apps/backend/src/router/routers/auth.ts
import { t } from "../context";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import nacl from "tweetnacl";
import bs58 from "bs58";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "../../lib/supabase";
import type { User } from "@supabase/supabase-js";

export const authRouter = t.router({
  /**
   * Generates a unique nonce for a user to sign.
   */
  getNonce: t.procedure
    .input(z.object({ walletAddress: z.string() }))
    .mutation(({ input }) => {
      const nonce = `Welcome to SolSignAI! Please sign this message to authenticate. This action is secure and will not cost any gas.\n\nWallet: ${input.walletAddress}\nNonce: ${Math.random().toString(36).substring(2, 15)}`;
      return { nonce };
    }),

  /**
   * Verifies a signature, finds or creates a user, and returns a JWT.
   */
  verify: t.procedure
    .input(
      z.object({
        publicKey: z.string(),
        signature: z.string(),
        nonce: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      console.log("🔐 Starting signature verification for:", input.publicKey);
      
      try {
        // 1. Verify the signature
        const signatureBytes = bs58.decode(input.signature);
        const publicKeyBytes = bs58.decode(input.publicKey);
        const nonceBytes = new TextEncoder().encode(input.nonce);

        const isVerified = nacl.sign.detached.verify(
          nonceBytes,
          signatureBytes,
          publicKeyBytes
        );

        if (!isVerified) {
          console.error("❌ Signature verification failed");
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Signature verification failed.",
          });
        }

        console.log("✅ Signature verified successfully");

        // 2. Find or Create the Auth User
        let user: User | undefined;

        console.log("👤 Attempting to create/find user in Supabase...");
        
        const { data: createData, error: creationError } =
          await supabaseAdmin.auth.admin.createUser({
            email: `${input.publicKey}@solsign.ai`,
            email_confirm: true,
            user_metadata: { wallet_address: input.publicKey },
            app_metadata: { wallet_address: input.publicKey },
          }).catch((err) => {
            console.error("❌ Supabase createUser threw exception:", err);
            return { data: null, error: err };
          });

        if (creationError) {
          console.log("⚠️ User creation returned error:", creationError);
          
          // Check if the error is because the user already exists
          const isUserConflict =
            creationError?.message?.includes("already") ||
            creationError?.message?.includes("exist") ||
            creationError?.message?.includes("duplicate");

          if (isUserConflict) {
            console.log("🔍 User exists, fetching from database...");
            // User exists, so we fetch them.
            const {
              data: { users },
              error: listError,
            } = await supabaseAdmin.auth.admin.listUsers();
            
            if (listError) {
              console.error("❌ Failed to list users:", listError);
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to list users after creation attempt failed.",
              });
            }

            const existingUser = users.find(
              (u) => u.user_metadata?.wallet_address === input.publicKey ||
                     u.app_metadata?.wallet_address === input.publicKey
            );
            
            if (!existingUser) {
              console.error("❌ User not found in list after conflict");
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "User conflict detected, but could not find existing user by wallet address.",
              });
            }
            
            console.log("✅ Found existing user:", existingUser.id);
            user = existingUser;
          } else {
            // A different, unexpected error occurred during creation.
            console.error(
              "❌ Supabase user creation failed with an unexpected error:",
              creationError
            );
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Could not create user. Reason: ${creationError?.message || "Unknown error"}`,
            });
          }
        } else {
          // Creation was successful!
          console.log("✅ User created successfully:", createData?.user?.id);
          user = createData?.user ?? undefined;
        }

        if (!user) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "User could not be identified after find/create process.",
          });
        }

        // 3. Create a Supabase-compatible JWT
        const jwtSecret = process.env.SUPABASE_JWT_SECRET;
        if (!jwtSecret) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "JWT Secret not configured.",
          });
        }

        const token = jwt.sign(
          {
            aud: "authenticated",
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 1 week
            sub: user.id,
            role: "authenticated",
            app_metadata: {
              wallet_address: input.publicKey,
            },
          },
          jwtSecret
        );

        return { token };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("An unexpected error occurred in auth.verify:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred.",
        });
      }
    }),
});
// [File Ends] apps/backend/src/router/routers/auth.ts
