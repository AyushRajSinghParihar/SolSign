import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

// This is a shared secret between our function and Helius.
// It proves that the request is legitimate.
const HELIUS_WEBHOOK_SECRET = Deno.env.get('HELIUS_WEBHOOK_SECRET')
if (!HELIUS_WEBHOOK_SECRET) {
  throw new Error('Missing environment variable HELIUS_WEBHOOK_SECRET')
}

// Standard CORS headers to allow requests from any origin.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // A CORS preflight request is sent by the browser to check if the server
  // will allow a request from a different origin. We must handle this.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Authenticate the request by checking the secret in the URL.
    const url = new URL(req.url)
    const incomingSecret = url.searchParams.get('secret')

    if (incomingSecret !== HELIUS_WEBHOOK_SECRET) {
      return new Response(JSON.stringify({ error: 'Invalid secret.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. If authenticated, process the webhook payload.
    const requestBody = await req.json()
    console.log('Received valid payload from Helius:', JSON.stringify(requestBody, null, 2))

    // TODO in Part 2: Add logic here to broadcast to Supabase Realtime.

    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error processing Helius webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})