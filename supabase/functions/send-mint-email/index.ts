import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- CONFIGURATION ---
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
if (!RESEND_API_KEY) throw new Error('Missing RESEND_API_KEY')

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL')

const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- MAIN FUNCTION ---
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    
    // 1. Get the payload, expecting `ownerWalletAddress`.
    const payload = await req.json()
    const { ownerWalletAddress, signature, arweaveTx } = payload

    // 2. Update the validation check to use the new variable name.
    if (!ownerWalletAddress || !signature || !arweaveTx) {
      throw new Error('Missing required payload properties: ownerWalletAddress, signature, arweaveTx')
    }

    let user: { email: string | null } | null = null;
    const MAX_RETRIES = 5;
    const RETRY_DELAY_MS = 1000; // 1 second

    console.log(`Attempting to fetch profile for wallet: ${ownerWalletAddress}`);
    for (let i = 0; i < MAX_RETRIES; i++) {
      console.log(`Attempt ${i + 1}/${MAX_RETRIES}...`);
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('email')
        .eq('wallet_address', ownerWalletAddress)
        .single();

      if (data) {
        user = data;
        console.log('Successfully fetched user profile.');
        break; // Exit the loop if we found the user
      }

      if (error && error.code !== 'PGRST116') { // PGRST116 is the "0 rows" error code
        throw error; // Throw any other unexpected database errors
      }

      console.log('User profile not found, waiting to retry (replication lag)...');
      await sleep(RETRY_DELAY_MS);
    }
    if (!user || !user.email) {
      console.log(`User with wallet ${ownerWalletAddress} has no email address. Skipping notification.`)
      return new Response(JSON.stringify({ message: 'User has no email.' }), { status: 200 })
    }

    // 4. Construct and send the email (unchanged)
    const solanaExplorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`
    const arweaveUrl = `https://arweave.net/${arweaveTx}`

    const emailBody = {
      from: 'SolSignAI <noreply@solsignai.com>',
      to: user.email,
      subject: '✅ Your Document has been Minted on Solana!',
      html: `
            <h1>Congratulations!</h1>
            <p>Your document has been successfully finalized and a permanent record has been created on the Solana blockchain.</p>
            <p><strong>Solana Transaction:</strong> <a href="${solanaExplorerUrl}">${signature}</a></p>
            <p><strong>Immutable Document:</strong> <a href="${arweaveUrl}">View on Arweave</a></p>
            <p>Thank you for using SolSignAI.</p>
          `,
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(emailBody),
    })

    if (!resendResponse.ok) {
      throw new Error(`Failed to send email: ${await resendResponse.text()}`)
    }
    
    console.log(`Successfully sent mint notification email to ${user.email}`)
    return new Response(JSON.stringify({ success: true }), { status: 200 })

  } catch (error) {
    console.error('Error sending mint email:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
