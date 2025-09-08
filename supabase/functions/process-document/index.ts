import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Buffer } from 'https://deno.land/std@0.177.0/node/buffer.ts'
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts'

// --- CONFIGURATION ---
// These are required for the function to interact with your Supabase project.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
if (!SUPABASE_URL) throw new Error('Missing environment variable SUPABASE_URL')

const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')

// This is the URL of the new Python microservice we are building.
const PARSER_SERVICE_URL = Deno.env.get('PARSER_SERVICE_URL')
if (!PARSER_SERVICE_URL) throw new Error('Missing environment variable PARSER_SERVICE_URL')

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- MAIN FUNCTION ---
serve(async (req) => {
  // This function is invoked by a database trigger, not a user,
  // so we don't handle CORS OPTIONS requests here.

  try {
    const adminSupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1. Get the file record from the trigger's payload
    const { record } = await req.json()
    const filePath = record.name // e.g., "user-uuid/document.pdf"

    if (!filePath) {
      throw new Error("File path ('name') not found in the trigger record.")
    }

    // 2. Reliably parse the owner's ID from the file path
    const pathParts = filePath.split('/');
    if (pathParts.length < 2) {
      throw new Error(`Invalid file path format. Expected '<user_id>/<file_name>', but got '${filePath}'.`);
    }
    const ownerId = pathParts[0];
    console.log(`Processing file: ${filePath} for owner: ${ownerId}`)

    // 3. Download the file from Supabase Storage
    const { data: fileData, error: downloadError } = await adminSupabaseClient.storage
      .from('documents')
      .download(filePath)

    if (downloadError) {
      throw new Error(`Failed to download file from storage: ${downloadError.message}`)
    }

    const fileBuffer = Buffer.from(await fileData.arrayBuffer())

    // 4. Calculate the SHA-256 hash to check for duplicates
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const sha256_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    console.log(`Calculated hash: ${sha256_hash}`)

    const { data: existingTemplate } = await adminSupabaseClient
      .from('templates')
      .select('id')
      .eq('sha256_hash', sha256_hash)
      .single()

    if (existingTemplate) {
      console.log(`Template with hash ${sha256_hash} already exists. Skipping.`)
      await adminSupabaseClient.storage.from('documents').remove([filePath])
      console.log(`Deleted duplicate file: ${filePath}`)
      return new Response(JSON.stringify({ message: 'Duplicate document ignored.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      })
    }

    // 5. Call the external Python parser service
    console.log(`Calling Python parser service at ${PARSER_SERVICE_URL}...`)
    const formData = new FormData()
    formData.append('file', new Blob([fileBuffer]), record.name)

    const parserResponse = await fetch(`${PARSER_SERVICE_URL}/process-pdf`, {
      method: 'POST',
      body: formData,
    })

    if (!parserResponse.ok) {
      const errorBody = await parserResponse.text()
      throw new Error(`Python parser service failed with status ${parserResponse.status}: ${errorBody}`)
    }
    const processedData = await parserResponse.json()
    console.log('Successfully received structured data from parser service.')

    // 6. Save the structured data to our `templates` table
    const { error: insertError } = await adminSupabaseClient
      .from('templates')
      .insert({
        sha256_hash,
        owner_id: ownerId,
        template_markdown: processedData.template_markdown,
        template_schema: processedData.template_schema,
        storage_path: filePath, // Still save the path to the original PDF for reference
      })

    if (insertError) {
      throw new Error(`Failed to save new template to database: ${insertError.message}`)
    }
    console.log('New Markdown-based template saved to database.')

    return new Response(
      JSON.stringify({ message: 'Template created successfully via Python parser.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error in process-document function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
    })
  }
})