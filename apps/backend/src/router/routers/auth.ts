import { t } from '../context'
import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import nacl from 'tweetnacl'
import bs58 from 'bs58'
import jwt from 'jsonwebtoken'
import { supabaseAdmin } from '../../lib/supabase'

export const authRouter = t.router({
  getNonce: t.procedure
    .input(z.object({ walletAddress: z.string() }))
    .mutation(({ input }) => {
      const nonce = `Welcome to SolSignAI! Please sign this message to authenticate. This action is secure and will not cost any gas.\n\nWallet: ${input.walletAddress}\nNonce: ${Math.random().toString(36).substring(2, 15)}`
      return { nonce }
    }),

  verify: t.procedure
    .input(
      z.object({
        publicKey: z.string(),
        signature: z.string(),
        nonce: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        // Verify the signature
        const signatureBytes = bs58.decode(input.signature)
        const publicKeyBytes = bs58.decode(input.publicKey)
        const nonceBytes = new TextEncoder().encode(input.nonce)

        const isVerified = nacl.sign.detached.verify(
          nonceBytes,
          signatureBytes,
          publicKeyBytes,
        )

        if (!isVerified) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Signature verification failed.',
          })
        }

        // Signature is valid, upsert user in our public `users` table
        const { error: upsertError } = await supabaseAdmin
          .from('users')
          .upsert({ wallet_address: input.publicKey }, { onConflict: 'wallet_address' })
        
        if (upsertError) {
          console.error('Supabase upsert error:', upsertError)
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Could not save user.',
          })
        }

        // Create a Supabase-compatible JWT
        const jwtSecret = process.env.SUPABASE_JWT_SECRET
        if (!jwtSecret) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'JWT Secret not configured on server.',
          })
        }

        const token = jwt.sign(
          {
            aud: 'authenticated',
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 1 week
            sub: input.publicKey, // Custom subject
            role: 'authenticated',
            // You can add more user-specific data here from your DB
          },
          jwtSecret,
        )

        return { token }
      } catch (error) {
        console.error(error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An error occurred during verification.',
        })
      }
    }),
})
