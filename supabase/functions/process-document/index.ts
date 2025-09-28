import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { Buffer } from "https://deno.land/std@0.177.0/node/buffer.ts";

// --- CONFIGURATION ---
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
if (!GEMINI_API_KEY) {
  throw new Error("Missing environment variable GEMINI_API_KEY");
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const PROMPT = `
You are an expert legal document analysis system. Your task is to analyze the provided PDF document and extract key information in a structured JSON format.
Analyze the document and identify:
1.  All fillable fields or variables (e.g., names, dates, addresses, amounts). For each, provide a label and a placeholder.
2.  All major clauses or sections. For each, provide a type (e.g., "Confidentiality", "Term", "Governing Law") and the full text of the clause.
Respond ONLY with a JSON object in the following format. Do not include any other text, explanations, or markdown formatting.
{
  "fields": [
    { "label": "Disclosing Party Name", "placeholder": "[Name of the party disclosing information]" },
    { "label": "Effective Date", "placeholder": "MM/DD/YYYY" }
  ],
  "clauses": [
    { "type": "Term", "text": "This Agreement shall commence on the Effective Date and shall continue for a period of five (5) years..." },
    { "type": "Confidentiality Obligation", "text": "The Receiving Party shall hold and maintain the Confidential Information in strictest confidence..." }
  ]
}
`;

// --- MAIN FUNCTION ---
Deno.serve(async (req) => {
  try {
    const adminSupabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { record } = await req.json();
    const filePath = record.name; // The full path, e.g., "user-uuid/document.pdf"

    // --- THIS IS THE DEFINITIVE FIX ---
    const pathParts = filePath.split("/");
    if (pathParts.length < 2) {
      throw new Error(
        `Invalid file path format. Expected '<user_id>/<file_name>', but got '${filePath}'.`
      );
    }
    const ownerId = pathParts[0]; // The first part of the path IS the user's UUID.
    // --- END OF FIX ---

    console.log(`Processing file: ${filePath} for owner: ${ownerId}`);

    const { data: fileData, error: downloadError } =
      await adminSupabaseClient.storage.from("documents").download(filePath);

    if (downloadError) throw downloadError;
    const fileBuffer = Buffer.from(await fileData.arrayBuffer());

    const hashBuffer = await crypto.subtle.digest("SHA-256", fileBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const sha256_hash = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    console.log(`Calculated hash: ${sha256_hash}`);

    const { data: existingTemplate } = await adminSupabaseClient
      .from("templates")
      .select("id")
      .eq("sha256_hash", sha256_hash)
      .single();

    if (existingTemplate) {
      console.log(
        `Template with hash ${sha256_hash} already exists. Skipping.`
      );
      await adminSupabaseClient.storage.from("documents").remove([filePath]);
      console.log(`Deleted duplicate file: ${filePath}`);
      return new Response(
        JSON.stringify({ message: "Duplicate document ignored." }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log("New document. Analyzing with Gemini...");
    const result = await model.generateContent([
      PROMPT,
      {
        inlineData: {
          data: fileBuffer.toString("base64"),
          mimeType: "application/pdf",
        },
      },
    ]);
    const aiResponseText = result.response.text();
    const jsonString = aiResponseText.replace(/```json\n|```/g, "").trim();
    const extracted_data_json = JSON.parse(jsonString);
    console.log("AI analysis complete.");

    const { error: insertError } = await adminSupabaseClient
      .from("templates")
      .insert({
        sha256_hash,
        owner_id: ownerId, // Use the reliably parsed ownerId
        extracted_data_json,
        storage_path: filePath,
      });

    if (insertError) throw insertError;
    console.log("New template saved to database.");

    return new Response(
      JSON.stringify({ message: "Template created successfully." }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error processing document:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
