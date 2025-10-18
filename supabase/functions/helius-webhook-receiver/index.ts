import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Buffer } from "https://deno.land/std@0.177.0/node/buffer.ts";
import { encode } from 'https://esm.sh/bs58@5.0.0';
import { Connection, PublicKey } from 'https://esm.sh/@solana/web3.js';
import bs58 from 'https://esm.sh/bs58@5.0.0';
import { BorshAccountsCoder } from 'https://esm.sh/@coral-xyz/anchor';


// --- CONFIGURATION ---
const HELIUS_WEBHOOK_SECRET = Deno.env.get('HELIUS_WEBHOOK_SECRET')
const HELIUS_API_KEY = Deno.env.get('HELIUS_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const IDL = {
  "address": "2LQ91xbS59NBWa6VbPxwzjNCPYVGqudcJ1cffBqmYmp2",
  "metadata": {
    "name": "solsign_program",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "mint_doc_nft",
      "docs": [
        "Creates a new DocNft account and initializes it with document metadata.",
        "",
        "# Arguments",
        "",
        "* `ctx` - The context containing all necessary accounts.",
        "* `doc_sha256` - The 32-byte SHA-256 hash of the document content.",
        "* `arweave_tx` - A 43-character string for the Arweave transaction ID.",
        "* `parties` - A vector of public keys for the signing parties.",
        "* `signed_at` - A Unix timestamp of when the document was finalized."
      ],
      "discriminator": [232, 177, 63, 155, 111, 246, 130, 70],
      "accounts": [
        {
          "name": "doc_nft",
          "docs": [
            "This is the new account we are creating for the DocNFT.",
            "`init`:       Tells Anchor to create this account.",
            "`payer`:      Specifies that the `authority` account will pay for the rent.",
            "`space`:      Defines how much space to allocate, using our `LEN` constant."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "authority",
          "docs": [
            "This is the user who is calling the instruction.",
            "`mut`:        Indicates that this account's SOL balance will be mutated (debited for rent).",
            "`Signer`:     Enforces that this account must have signed the transaction."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "system_program",
          "docs": [
            "The System Program is a native Solana program required for creating new accounts.",
            "Anchor handles passing this in for us."
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "doc_sha256",
          "type": {
            "array": ["u8", 32]
          }
        },
        {
          "name": "arweave_tx",
          "type": "string"
        },
        {
          "name": "parties",
          "type": {
            "vec": "pubkey"
          }
        },
        {
          "name": "signed_at",
          "type": "i64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "DocNft",
      "discriminator": [199, 39, 114, 50, 218, 211, 229, 196]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidArweaveTx",
      "msg": "The provided Arweave transaction ID must be 43 characters long."
    },
    {
      "code": 6001,
      "name": "NoParties",
      "msg": "The document must have at least one signing party."
    }
  ],
  "types": [
    {
      "name": "DocNft",
      "docs": [
        "Defines the structure of the on-chain account that stores DocNFT metadata."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "docs": [
              "The user who has authority over this DocNFT account (the document owner)."
            ],
            "type": "pubkey"
          },
          {
            "name": "doc_sha256",
            "docs": [
              "The immutable SHA-256 hash of the document content.",
              "We use a fixed-size array for efficiency, as SHA-256 is always 32 bytes."
            ],
            "type": {
              "array": ["u8", 32]
            }
          },
          {
            "name": "arweave_tx",
            "docs": [
              "The transaction ID from Arweave where the final PDF is stored.",
              "We limit its size in the `LEN` constant below."
            ],
            "type": "string"
          },
          {
            "name": "parties",
            "docs": [
              "A list of all parties who signed the document.",
              "For the MVP, this will just be the document owner."
            ],
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "signed_at",
            "docs": [
              "The Unix timestamp of when the document was finalized and signed."
            ],
            "type": "i64"
          }
        ]
      }
    }
  ]
}


if (!HELIUS_WEBHOOK_SECRET || !HELIUS_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing one or more required environment variables.')
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Authenticate the webhook request (unchanged)
    const url = new URL(req.url)
    if (url.searchParams.get('secret') !== HELIUS_WEBHOOK_SECRET) {
      return new Response(JSON.stringify({ error: 'Invalid secret.' }), { status: 401 })
    }

    const webhookData = await req.json()
    console.log('Received valid payload from Helius.')
    
    const transactionInfo = webhookData[0] || {}
    const signature = transactionInfo.signature
    const docNftAccountAddress = transactionInfo.instructions?.[0]?.accounts?.[0]

    if (!docNftAccountAddress) {
      throw new Error('Could not find DocNFT account address in Helius payload.')
    }

    // 2. Use the official web3.js Connection object to fetch account data.
    const heliusRpcUrl = `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
    const connection = new Connection(heliusRpcUrl, 'confirmed');

    let accountDataBuffer: Buffer | undefined;
    const MAX_RETRIES = 5;
    const RETRY_DELAY_MS = 2000;

    console.log(`Attempting to fetch account data for ${docNftAccountAddress}...`);
    for (let i = 0; i < MAX_RETRIES; i++) {
      console.log(`Attempt ${i + 1}/${MAX_RETRIES}...`);
      const accountInfo = await connection.getAccountInfo(new PublicKey(docNftAccountAddress));
      
      if (accountInfo?.data) {
        accountDataBuffer = accountInfo.data;
        console.log('Successfully fetched account data.');
        break;
      }
      console.log('Account data not found, waiting to retry...');
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    }

    if (!accountDataBuffer) {
      throw new Error(`Could not find account data after ${MAX_RETRIES} attempts.`)
    }
    let arweaveTx: string;
    let ownerWalletAddress: string;

    // Initialize the Borsh coder with our IDL
    const coder = new BorshAccountsCoder(IDL as any);

   try {
  // Pass the FULL buffer - the coder will validate and strip the discriminator
  const decodedAccount = coder.decode('DocNft', accountDataBuffer);
  
  console.log('✅ Anchor decoding with FULL buffer successful!');
  
  // DETAILED INSPECTION of the decoded object
  console.log('--- FULL DECODED OBJECT INSPECTION ---');
  console.log('Decoded account type:', typeof decodedAccount);
  console.log('Decoded account constructor:', decodedAccount.constructor.name);
  console.log('All keys in decoded object:', Object.keys(decodedAccount));
  console.log('Object.getOwnPropertyNames:', Object.getOwnPropertyNames(decodedAccount));
  
  // Check each field individually
  console.log('--- INDIVIDUAL FIELD INSPECTION ---');
  console.log('authority exists:', 'authority' in decodedAccount);
  console.log('authority value:', decodedAccount.authority);
  console.log('authority type:', typeof decodedAccount.authority);
  
  console.log('arweaveTx exists:', 'arweaveTx' in decodedAccount);
  console.log('arweaveTx value:', decodedAccount.arweaveTx);
  console.log('arweaveTx type:', typeof decodedAccount.arweaveTx);
  console.log('arweaveTx === undefined:', decodedAccount.arweaveTx === undefined);
  console.log('arweaveTx === null:', decodedAccount.arweaveTx === null);
  console.log('arweaveTx === "":', decodedAccount.arweaveTx === "");
  
  console.log('parties exists:', 'parties' in decodedAccount);
  console.log('parties value:', decodedAccount.parties);
  console.log('parties type:', typeof decodedAccount.parties);
  console.log('parties length:', decodedAccount.parties?.length);
  
  console.log('signedAt exists:', 'signedAt' in decodedAccount);
  console.log('signedAt value:', decodedAccount.signedAt);
  console.log('signedAt type:', typeof decodedAccount.signedAt);
  
  // Try different ways to access the arweave field
  console.log('--- ALTERNATIVE ACCESS PATTERNS ---');
  console.log('decodedAccount["arweaveTx"]:', decodedAccount["arweaveTx"]);
  console.log('decodedAccount.arweave_tx:', decodedAccount.arweave_tx); // snake_case
  console.log('decodedAccount["arweave_tx"]:', decodedAccount["arweave_tx"]);
  
  // JSON stringify to see the full structure
  console.log('--- JSON REPRESENTATION ---');
  try {
    console.log('JSON.stringify(decodedAccount):', JSON.stringify(decodedAccount, null, 2));
  } catch (jsonError) {
    console.log('JSON.stringify failed:', jsonError.message);
    console.log('Trying JSON.stringify with custom replacer...');
    console.log('JSON with replacer:', JSON.stringify(decodedAccount, (key, value) => {
      if (value && typeof value === 'object' && value.constructor && value.constructor.name === 'PublicKey') {
        return value.toBase58();
      }
      return value;
    }, 2));
  }
  
  // Extract values for comparison
  const arweaveTx = decodedAccount.arweaveTx || decodedAccount.arweave_tx;
  const ownerWalletAddress = decodedAccount.parties?.[0]?.toBase58();
  
  console.log(`Successfully parsed account data. Owner: ${ownerWalletAddress}, Arweave TX: ${arweaveTx}`);
  
  if (!signature || !arweaveTx || !ownerWalletAddress) {
    console.log('--- VALIDATION DETAILS ---');
    console.log('signature exists:', !!signature);
    console.log('signature value:', signature);
    console.log('arweaveTx exists:', !!arweaveTx);
    console.log('arweaveTx value:', arweaveTx);
    console.log('ownerWalletAddress exists:', !!ownerWalletAddress);
    console.log('ownerWalletAddress value:', ownerWalletAddress);
    
    throw new Error('Incomplete data after parsing on-chain state.')
  }
  
  
} catch (decodeError) {
      console.error('⚠️ Anchor decode with full buffer failed:', decodeError.message);
      console.log('--- DECODING ACCOUNT DATA (Attempt 2: Manual Parsing) ---');

      try {
        // Skip discriminator (8 bytes) and manually parse
        const data = accountDataBuffer.slice(8);
        let offset = 0;
        
        // Authority (32 bytes)
        offset += 32;
        // doc_sha256 (32 bytes)
        offset += 32;
        
        // arweave_tx string
        const stringLength = data.readUInt32LE(offset);
        offset += 4;
        if (stringLength > 200) throw new Error(`Invalid Arweave TX string length: ${stringLength}`);
        const arweaveTxBytes = data.slice(offset, offset + stringLength);
        arweaveTx = arweaveTxBytes.toString('utf-8');
        offset += stringLength;
        
        // parties vector
        const vecLength = data.readUInt32LE(offset);
        offset += 4;
        if (vecLength === 0) throw new Error('Parties vector is empty.');
        
        const firstPartyBytes = data.slice(offset, offset + 32);
        ownerWalletAddress = bs58.encode(firstPartyBytes);
        
        console.log('✅ Manual decoding successful!');

      } catch (manualError) {
        console.error('❌ Manual decoding also failed:', manualError);
        throw new Error('Both Anchor and manual decoding failed.');
      }
    }
    
    console.log(`Successfully parsed account data. Owner: ${ownerWalletAddress}, Arweave TX: ${arweaveTx}`);

    if (!signature || !arweaveTx || !ownerWalletAddress) {
        throw new Error('Incomplete data after parsing on-chain state.')
    }
    
    // 5. Invoke the send-mint-email function with the CORRECT wallet address
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    await supabaseAdmin.functions.invoke('send-mint-email', {
      body: { ownerWalletAddress, signature, arweaveTx },
    })

    console.log(`Successfully invoked send-mint-email for user: ${ownerWalletAddress}`)
    return new Response(JSON.stringify({ received: true, invoked: true }), { status: 200 })
  } catch (error) {
    console.error('Error processing Helius webhook:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
