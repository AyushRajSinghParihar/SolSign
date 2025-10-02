import { z } from 'zod'
import { protectedProcedure, t } from '../context'
import { TRPCError } from '@trpc/server'
import { supabaseAdmin } from '../../lib/supabase'

// Define a structured schema for the parameters for better AI parsing.
// This will be used by both `startNegotiation` and `provideInstructions`.
const negotiationParametersSchema = z.object({
  instructions: z.string().min(20, "Instructions must be at least 20 characters."),
  // Example of adding more structured fields in the future:
  // minimum_payment: z.number().optional(),
});

export const agentRouter = t.router({
  /**
   * Creates a new negotiation record and triggers the agent backend via a Supabase Webhook.
   */
  startNegotiation: protectedProcedure
    .input(z.object({
      documentId: z.string().uuid(),
      counterpartyEmail: z.string().email(),
      parameters: negotiationParametersSchema,
    }))
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;
      const { documentId, counterpartyEmail, parameters } = input;

      // 1. Verify the user owns the document using the RLS-powered client
      const { data: doc, error: docError } = await ctx.supabase
        .from('documents')
        .select('id, owner_id')
        .eq('id', documentId)
        .single();
      
      if (docError || !doc || doc.owner_id !== user.sub) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not own this document or it does not exist.' });
      }

      // 2. Check if a negotiation for this document already exists
      const { data: existingNegotiation } = await supabaseAdmin
        .from('negotiations')
        .select('id')
        .eq('document_id', documentId)
        .maybeSingle();

      if (existingNegotiation) {
        throw new TRPCError({ code: 'CONFLICT', message: 'A negotiation for this document has already been started.' });
      }

      // 3. Create the negotiation record with status 'pending_initiation'
      const { data: negotiation, error: negError } = await supabaseAdmin
        .from('negotiations')
        .insert({
          document_id: documentId,
          owner_id: user.sub,
          counterparty_email: counterpartyEmail,
          parameters: parameters,
          history: [{
            role: 'system',
            content: `Negotiation initiated by owner. Parameters: ${JSON.stringify(parameters)}`,
            timestamp: new Date().toISOString(),
          }],
        })
        .select()
        .single();

      if (negError) {
        console.error("Error creating negotiation record:", negError);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create negotiation record.' });
      }

      console.log(`[LOG] Negotiation ${negotiation.id} created. Status: pending_initiation. Agent will be triggered.`);
      return negotiation;
    }),

  /**
   * Fetches all negotiations owned by the current user.
   * Joins with the documents table to get the document name.
   */
  getAllNegotiations: protectedProcedure
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from('negotiations')
        .select(`
          id,
          status,
          counterparty_email,
          updated_at,
          document:documents (
            name
          )
        `)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error("Error fetching negotiations:", error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch negotiations.' });
      }
      return data;
    }),

  /**
   * Fetches a single negotiation by its ID, enforcing RLS.
   */
  getNegotiationById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('negotiations')
        .select('*')
        .eq('id', input.id)
        .single();

      if (error || !data) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Negotiation not found or you do not have access.' });
      }
      return data;
    }),

  /**
   * Allows a user to provide new instructions for an escalated negotiation.
   */
  provideInstructions: protectedProcedure
    .input(z.object({
      negotiationId: z.string().uuid(),
      instructions: z.string().min(10, "Instructions must be at least 10 characters."),
    }))
    .mutation(async ({ ctx, input }) => {
      const { negotiationId, instructions } = input;

      // 1. Verify ownership and that the negotiation is in 'escalated' state using RLS client
      const { data: negotiation, error: negError } = await ctx.supabase
        .from('negotiations')
        .select('id, history')
        .eq('id', negotiationId)
        .eq('status', 'escalated')
        .single();

      if (negError || !negotiation) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No escalated negotiation found with that ID that you own.' });
      }

      // 2. Append the user's instructions to the history and reset status
      const newHistoryEntry = {
        role: 'user', // The owner providing instructions
        content: `New instructions provided: ${instructions}`,
        timestamp: new Date().toISOString(),
      };
      const updatedHistory = [...negotiation.history, newHistoryEntry];

      // Use admin client to perform the update after RLS check
      const { data: updatedNegotiation, error: updateError } = await supabaseAdmin
        .from('negotiations')
        .update({
          status: 'in_progress', // Set status back to in_progress for the agent to pick up
          history: updatedHistory,
        })
        .eq('id', negotiationId)
        .select()
        .single();
      
      if (updateError) {
        console.error("Error updating negotiation with new instructions:", updateError);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update negotiation.' });
      }

      // TODO: In a production system, you would trigger the agent backend here to
      // re-process this negotiation immediately, rather than waiting for the next email.
      // This could be a direct HTTP call or another Supabase Webhook on UPDATE.

      return updatedNegotiation;
    }),
});