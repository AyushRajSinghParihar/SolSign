import { z } from "zod";
import { protectedProcedure, t } from "../context";
import { supabaseAdmin } from "../../lib/supabase";
import { TRPCError } from "@trpc/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { webcrypto } from "crypto";
import { generateFinalPdf } from "../../lib/pdf";
import { uploadToArweave } from "../../lib/irys";
import { mintDocNftOnChain } from "../../lib/solana";
import { PublicKey } from "@solana/web3.js";

// --- AI CONFIGURATION ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error("Missing environment variable GEMINI_API_KEY for backend");
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Helper function for adding timeouts to promises
const withTimeout = <T>(
  promise: Promise<T>,
  ms: number,
  message: string
): Promise<T> => {
  const timeout = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error(message)), ms)
  );
  return Promise.race([promise, timeout]);
};

export const documentsRouter = t.router({
  /**
   * Creates a new document instance from a template for the user.
   */
  create: protectedProcedure
    .input(
      z.object({
        templateId: z.string().uuid(),
        name: z.string().min(1, "Document name is required."),
      })
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
        `
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
          z.object({ label: z.string(), placeholder: z.string() })
        ),
        vaultData: z.record(z.string(), z.any()),
      })
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
      })
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
      })
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
      })
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
          updateError
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not update document status.",
        });
      }

      return updatedDocument;
    }),
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const { user } = ctx;
    const { data, error } = await supabaseAdmin
      .from("documents")
      .select("*")
      .eq("owner_id", user.sub)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching user documents:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Could not fetch documents.",
      });
    }
    return data;
  }),
  finalizeAndMint: protectedProcedure
    .input(z.object({ documentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      const { documentId } = input;

      console.log(
        `[LOG] ENTERING finalizeAndMint for doc: ${documentId}, user: ${user.sub}`
      );

      // --- Layer 2: Comprehensive Error Handling ---
      const { data: document, error: docError } = await supabaseAdmin
        .from("documents")
        .select(`*, template:templates (*)`)
        .eq("id", documentId)
        .eq("owner_id", user.sub)
        .single();

      if (docError) {
        console.error(`[LOG] Database error fetching document:`, docError);
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Failed to fetch document: ${docError.message}`,
        });
      }
      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found or you do not have permission.",
        });
      }
      if (document.status !== "signed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Document must be in "signed" state to be minted, but is "${document.status}".`,
        });
      }

      // --- Layer 3: Proper Empty Data Detection ---
      if (
        !document.filled_data_json ||
        Object.keys(document.filled_data_json).length === 0
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Document has no filled data to finalize. Please fill the document first.",
        });
      }

      // We will wrap each major async operation in its own try/catch block
      // for progressive error boundaries.
      let finalPdfBuffer: Buffer;
      // let documentHash: Uint8Array;
      let arweaveTx: string;
      // let solanaTx: string;

      try {
        console.log(`[LOG] [1/5] About to generate PDF...`);
        console.log(
          `[LOG] Template storage path: ${document.template.storage_path}`
        );
        console.log(
          `[LOG] Document filled_data_json:`,
          document.filled_data_json
        );

        // --- Layer 4: Timeout Protection ---
        finalPdfBuffer = await withTimeout(
          generateFinalPdf(
            document.template.storage_path,
            document.filled_data_json as Record<string, string>
          ),
          30000, // 30 second timeout
          "PDF generation timed out."
        );
        console.log(
          `[LOG] [1/5] PDF generation COMPLETE. Buffer size: ${finalPdfBuffer.length}`
        );

        console.log(`[LOG] [2/5] About to calculate hash...`);
        const hashBuffer = await webcrypto.subtle.digest(
          "SHA-256",
          finalPdfBuffer
        );
        // Convert the ArrayBuffer to a Uint8Array, which is what our tools expect.
        const documentHash = new Uint8Array(hashBuffer);
        if (!documentHash || documentHash.length === 0) {
          throw new Error(
            "SHA-256 hash calculation resulted in an empty value."
          );
        }
        console.log(
          `[LOG] [2/5] Hash calculation COMPLETE. Hash: ${Buffer.from(documentHash).toString("hex")}`
        );
        console.log(`[LOG] [3/5] About to upload to Arweave/Irys...`);
        arweaveTx = await withTimeout(
          uploadToArweave(finalPdfBuffer),
          120000, // 2 minute timeout for blockchain transaction
          "Arweave/Irys upload timed out."
        );
        console.log(
          `[LOG] [3/5] Arweave/Irys upload COMPLETE. TX: ${arweaveTx}`
        );

        // Log the user object and the specific property we are about to use.
        console.log(
          "[LOG] Preparing to mint. User object:",
          JSON.stringify(user, null, 2)
        );
        console.log(
          "[LOG] Wallet address from metadata:",
          user.app_metadata?.wallet_address
        );

        console.log("[4/5] Minting DocNFT on Solana...");
        const solanaTx = await withTimeout(
          mintDocNftOnChain({
            docSha256: Array.from(documentHash),
            arweaveTx: arweaveTx,
            // Add a check here as well to throw a clear error
            parties: [new PublicKey(user.app_metadata.wallet_address!)],
            signedAt: Math.floor(Date.now() / 1000),
          }),
          120000, // 2 minute timeout
          "Solana NFT minting timed out."
        );

        console.log(`[LOG] [4/5] Solana mint COMPLETE. TX: ${solanaTx}`);

        console.log(`[LOG] [5/5] About to update database status...`);
        await supabaseAdmin
          .from("documents")
          .update({ status: "minted" })
          .eq("id", documentId);

        await supabaseAdmin
          .from("signatures")
          .update({
            onchain_tx_signature: solanaTx,
            arweave_tx_id: arweaveTx,
          })
          .eq("document_id", documentId);
        console.log(`[LOG] [5/5] Database update COMPLETE.`);

        console.log(`[LOG] FINALIZING and returning response.`);
        return { solanaTx, arweaveTx };
      } catch (error) {
        console.error(`[LOG] ERROR caught in finalizeAndMint pipeline:`, error);
        let errorMessage = "An unknown error occurred.";
        if (error instanceof Error) {
          errorMessage = error.message;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed during finalization: ${errorMessage}`,
        });
      }
    }),
});
