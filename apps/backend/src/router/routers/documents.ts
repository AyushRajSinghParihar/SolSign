import { z } from "zod";
import { protectedProcedure, t } from "../context";
import { supabaseAdmin } from "../../lib/supabase";
import { TRPCError } from "@trpc/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- AI CONFIGURATION ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error("Missing environment variable GEMINI_API_KEY for backend");
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export const documentsRouter = t.router({
  /**
   * Creates a new document instance from a template for the user.
   */
  create: protectedProcedure
    .input(
      z.object({
        templateId: z.string().uuid(),
        name: z.string().min(1, "Document name is required."),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      const { templateId, name } = input;

      const { data, error } = await supabaseAdmin
        .from("documents")
        .insert({
          template_id: templateId,
          owner_id: user.sub,
          name,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating document:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not create document.",
        });
      }
      return data;
    }),

  /**
   * Gets a single document by its ID, including its template.
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const { id } = input;
      const { data, error } = await supabaseAdmin
        .from("documents")
        .select(
          `
          *,
          template:templates (*)
        `,
        )
        .eq("id", id)
        .single();

      if (error) {
        console.error(`Error fetching document ${id}:`, error);
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found.",
        });
      }
      return data;
    }),

  /**
   * Uses AI to map a user's vault data to a template's fields.
   */
  autofill: protectedProcedure
    .input(
      z.object({
        templateFields: z.array(
          z.object({ label: z.string(), placeholder: z.string() }),
        ),
        vaultData: z.record(z.string(), z.any()),
      }),
    )
    .mutation(async ({ input }) => {
      const { templateFields, vaultData } = input;

      const prompt = `
        You are a highly accurate data mapping assistant for legal documents.
        Your task is to map a user's JSON data vault to a list of required document fields.

        **Instructions:**
        1.  Analyze the DOCUMENT TEMPLATE FIELDS provided below.
        2.  Analyze the USER'S PERSONAL DATA VAULT JSON.
        3.  For each field in the template, find the most logical corresponding value from the user's data.
        4.  Semantic matching is key (e.g., "Full Name" in the template should match "fullName" or "name" in the data).
        5.  If a corresponding value cannot be found for a field, YOU MUST use an empty string "" as its value.
        6.  Your response MUST BE ONLY a single, valid JSON object. Do not include any text, explanations, or markdown formatting like \`\`\`json.

        **DOCUMENT TEMPLATE FIELDS:**
        ${JSON.stringify(templateFields, null, 2)}

        **USER'S PERSONAL DATA VAULT:**
        ${JSON.stringify(vaultData, null, 2)}

        **Required Output Format (JSON Object):**
        {
          "Template Field Label 1": "Corresponding Vault Value",
          "Template Field Label 2": "Corresponding Vault Value",
          "A Field with No Match": ""
        }
      `;

      try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const jsonString = responseText.replace(/```json\n|```/g, "").trim();
        return JSON.parse(jsonString);
      } catch (error) {
        console.error("Error during AI autofill:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "AI autofill failed.",
        });
      }
    }),

  /**
   * Uses AI to check for logical conflicts in filled document data.
   */
  checkForConflicts: protectedProcedure
    .input(
      z.object({
        filledFields: z.record(z.string(), z.string()),
      }),
    )
    .mutation(async ({ input }) => {
      const { filledFields } = input;

      const prompt = `
        You are a meticulous legal compliance checker. Your task is to find logical inconsistencies in document data.

        **Instructions:**
        1.  Analyze the key-value DOCUMENT DATA provided below.
        2.  Identify any logical conflicts, such as dates being out of order, names being inconsistent, or values that seem illogical in a legal context.
        3.  Your response MUST BE ONLY a single, valid JSON array of issue objects.
        4.  Each issue object must have a "field" key (the name of the field with the issue) and an "issue" key (a brief, clear description of the problem).
        5.  If there are absolutely no issues, you MUST return an empty array [].
        6.  Do not include any text, explanations, or markdown formatting like \`\`\`json.

        **DOCUMENT DATA:**
        ${JSON.stringify(filledFields, null, 2)}

        **Required Output Format (JSON Array):**
        [
          { "field": "FieldName", "issue": "Description of the conflict." }
        ]
      `;
      try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const jsonString = responseText.replace(/```json\n|```/g, "").trim();
        return JSON.parse(jsonString);
      } catch (error) {
        console.error("Error during AI conflict check:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "AI conflict check failed.",
        });
      }
    }),

  /**
   * Saves the current filled data of a document.
   */
  save: protectedProcedure
    .input(
      z.object({
        documentId: z.string().uuid(),
        filledData: z.record(z.string(), z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      const { documentId, filledData } = input;

      const { data, error } = await supabaseAdmin
        .from("documents")
        .update({
          filled_data_json: filledData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId)
        .eq("owner_id", user.sub)
        .select()
        .single();

      if (error) {
        console.error("Error saving document:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not save document draft.",
        });
      }
      return data;
    }),

  /**
   * Records a signature for a document and updates its status.
   */
  sign: protectedProcedure
    .input(
      z.object({
        documentId: z.string().uuid(),
        documentHash: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      const { documentId, documentHash } = input;

      // Step 1: Insert the signature record
      const { error: signatureError } = await supabaseAdmin
        .from("signatures")
        .insert({
          document_id: documentId,
          signer_id: user.sub,
          signature_hash: documentHash,
        });

      if (signatureError) {
        console.error("Error creating signature record:", signatureError);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not record signature.",
        });
      }

      // Step 2: Update the document status to "signed"
      const { data: updatedDocument, error: updateError } = await supabaseAdmin
        .from("documents")
        .update({
          status: "signed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId)
        .eq("owner_id", user.sub)
        .select()
        .single();

      if (updateError) {
        console.error(
          "Error updating document status after signing:",
          updateError,
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not update document status.",
        });
      }

      return updatedDocument;
    }),
});
