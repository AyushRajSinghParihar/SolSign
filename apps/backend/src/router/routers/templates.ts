import { protectedProcedure, t } from "../context";
import { supabaseAdmin } from "../../lib/supabase";
import { TRPCError } from "@trpc/server";

export const templatesRouter = t.router({
  /**
   * Fetches all available templates.
   */
  getTemplates: protectedProcedure.query(async () => {
    const { data, error } = await supabaseAdmin
      .from("templates")
      .select(
        `
        id,
        created_at,
        extracted_data_json,
        owner:users (
          wallet_address
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching templates:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not fetch templates.",
      });
    }

    return data;
  }),
});
