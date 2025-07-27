import { z } from "zod";
import { protectedProcedure, t } from "../context";
import { supabaseAdmin } from "../../lib/supabase";
import { TRPCError } from "@trpc/server";

export const vaultRouter = t.router({
  /**
   * Creates a new encrypted item in the user's vault.
   */
  createItem: protectedProcedure
    .input(
      z.object({
        type: z.string().min(1, "Type is required"),
        ciphertext: z.string().min(1, "Ciphertext is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx; // user.sub is the UUID
      const { type, ciphertext } = input;

      const { data, error } = await supabaseAdmin
        .from("vault_items")
        .insert({
          owner_id: user.sub, // <-- Use user's UUID for the owner_id column
          type,
          ciphertext,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating vault item:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not create vault item.",
        });
      }

      return data;
    }),

  /**
   * Fetches all vault items for the authenticated user.
   */
  getItems: protectedProcedure.query(async ({ ctx }) => {
    const { user } = ctx;

    const { data, error } = await supabaseAdmin
      .from("vault_items")
      .select("*")
      .eq("owner_id", user.sub) // <-- Query by owner_id
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching vault items:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not fetch vault items.",
      });
    }

    return data;
  }),

  /**
   * Deletes a specific vault item owned by the user.
   */
  deleteItem: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      const { id } = input;

      // RLS is the true security layer here. This query will fail if
      // the `owner_id` does not match the authenticated user's ID.
      const { error } = await supabaseAdmin
        .from("vault_items")
        .delete()
        .match({ id: id, owner_id: user.sub }); // <-- Match by owner_id

      if (error) {
        console.error("Error deleting vault item:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not delete vault item.",
        });
      }

      return { success: true };
    }),
});
