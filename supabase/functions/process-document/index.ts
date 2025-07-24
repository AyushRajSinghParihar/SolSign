import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai'
import { Buffer } from 'https://deno.land/std@0.177.0/node/buffer.ts'

// --- CONFIGURATION ---
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
if (!GEMINI_API_KEY) {
  throw new Error('Missing environment variable GEMINI_API_KEY')
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

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
`

// --- MAIN FUNCTION ---
Deno.serve(async (req) => {
  try {
    // 1. Create Supabase clients
    // Create a new client with the user's auth token to check RLS
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    // Create an admin client to perform privileged operations
    const adminSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // 2. Get user and file details from the request body
    const { record } = await req.json()
    const { data: { user } } = await userSupabaseClient.auth.getUser()

    if (!user) {
      throw new Error('User not authenticated')
    }
    
    const filePath = record.path
    console.log(`Processing file: ${filePath}`)

    // 3. Download the file from Supabase Storage
    const { data: fileData, error: downloadError } = await adminSupabaseClient.storage
      .from('documents')
      .download(filePath)

    if (downloadError) throw downloadError

    const fileBuffer = Buffer.from(await fileData.arrayBuffer())

    // 4. Calculate SHA256 hash to check for duplicates
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const sha256_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    console.log(`Calculated hash: ${sha256_hash}`)

    // 5. Check if a template with this hash already exists
    const { data: existingTemplate, error: checkError } = await adminSupabaseClient
      .from('templates')
      .select('id')
      .eq('sha256_hash', sha256_hash)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // Ignore "no rows found" error
      throw checkError
    }

    if (existingTemplate) {
      console.log(`Template with hash ${sha256_hash} already exists. Skipping.`)
      return new Response(JSON.stringify({ message: 'Template already exists.' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 6. If new, analyze with Gemini AI
    console.log('New document. Analyzing with Gemini...')
    const result = await model.generateContent([
      PROMPT,
      {
        inlineData: {
          data: fileBuffer.toString('base64'),
          mimeType: 'application/pdf',
        },
      },
    ])
    
    const aiResponseText = result.response.text()
    // Clean the response to ensure it's valid JSON
    const jsonString = aiResponseText.replace(/```json\n|```/g, '').trim()
    const extracted_data_json = JSON.parse(jsonString)
    console.log('AI analysis complete.')

    // 7. Insert the new template into the database
    const { error: insertError } = await adminSupabaseClient
      .from('templates')
      .insert({
        sha256_hash,
        owner_id: user.id,
        extracted_data_json,
        storage_path: filePath,
      })

    if (insertError) throw insertError
    console.log('New template saved to database.')

    return new Response(JSON.stringify({ message: 'Template created successfully.' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error processing document:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})