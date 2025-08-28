import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- CONFIGURATION ---
const HELIUS_WEBHOOK_SECRET = Deno.env.get('HELIUS_WEBHOOK_SECRET')
if (!HELIUS_WEBHOOK_SECRET) throw new Error('Missing HELIUS_WEBHOOK_SECRET')

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL')

const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create a Supabase Admin Client. We use the service_role key for powerful access.
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// --- MAIN FUNCTION ---
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Authenticate the request (unchanged)
    const url = new URL(req.url)
    if (url.searchParams.get('secret') !== HELIUS_WEBHOOK_SECRET) {
      return new Response(JSON.stringify({ error: 'Invalid secret.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 2. Process the webhook payload (unchanged)
    const webhookData = await req.json()
    console.log('Received valid payload from Helius:', JSON.stringify(webhookData, null, 2))

    // --- THIS IS THE NEW LOGIC ---
    // 3. Broadcast an event using Supabase Realtime
    // We'll broadcast to a channel named 'solsign-events'
    const channel = supabaseAdmin.channel('solsign-events')
    
    // The event will be 'doc-minted', and we'll send a subset of the Helius data.
    // Helius sends an array of transactions, we'll process the first one.
    const transactionInfo = webhookData[0] || {}
    
    const broadcastPayload = {
      eventType: 'doc-minted',
      signature: transactionInfo.signature,
      account: transactionInfo.accountData?.[0]?.account, // The DocNFT account address
      timestamp: transactionInfo.timestamp,
    }

    const status = await channel.send({
      type: 'broadcast',
      event: 'doc-minted',
      payload: broadcastPayload,
    })

    if (status === 'ok') {
      console.log('Successfully broadcast "doc-minted" event to Supabase Realtime.')
    } else {
      console.error('Failed to broadcast event to Supabase Realtime. Status:', status)
    }

    return new Response(JSON.stringify({ received: true, broadcast: status }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('Error processing Helius webhook:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})