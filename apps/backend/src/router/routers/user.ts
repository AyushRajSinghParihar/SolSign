import { z } from "zod";
import { protectedProcedure, t } from "../context";
import { supabaseAdmin } from "../../lib/supabase";
import { TRPCError } from "@trpc/server";

export const userRouter = t.router({
  /**
   * Fetches the profile of the currently authenticated user.
   */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const { user } = ctx;
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("wallet_address, email")
      .eq("id", user.sub)
      .single();

    if (error) {
      console.error("Error fetching user profile:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not fetch user profile.",
      });
    }
    return data;
  }),

  /**
   * Updates the email address for the currently authenticated user.
   */
  updateEmail: protectedProcedure
    .input(
      z.object({
        // Use Zod's built-in email validation
        email: z.string().email("Please enter a valid email address."),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      const { email } = input;

      const { data, error } = await supabaseAdmin
        .from("users")
        .update({ email })
        .eq("id", user.sub)
        .select()
        .single();

      if (error) {
        // Handle unique constraint violation (email already exists)
        if (error.code === "23505") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This email address is already in use by another account.",
          });
        }
        console.error("Error updating email:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not update your email address.",
        });
      }
      return data;
    }),
});
