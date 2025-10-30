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

      console.log('='.repeat(80));
      console.log('[AGENT] 🚀 START NEGOTIATION REQUEST');
      console.log('='.repeat(80));
      console.log('[AGENT] User ID:', user.sub);
      console.log('[AGENT] Document ID:', documentId);
      console.log('[AGENT] Counterparty Email:', counterpartyEmail);
      console.log('[AGENT] Parameters:', JSON.stringify(parameters, null, 2));
      console.log('[AGENT] Timestamp:', new Date().toISOString());

      // 1. Verify the user owns the document using the RLS-powered client
      console.log('[AGENT] Step 1/5: Verifying document ownership...');
      const { data: doc, error: docError } = await ctx.supabase
        .from('documents')
        .select('id, owner_id, name, status')
        .eq('id', documentId)
        .single();

      if (docError) {
        console.error('[AGENT] ❌ Document query error:', docError);
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not own this document or it does not exist.' });
      }

      if (!doc) {
        console.error('[AGENT] ❌ Document not found');
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Document not found.' });
      }

      console.log('[AGENT] ✅ Document found:', {
        id: doc.id,
        name: doc.name,
        owner_id: doc.owner_id,
        status: doc.status
      });

      if (doc.owner_id !== user.sub) {
        console.error('[AGENT] ❌ Ownership mismatch:', {
          document_owner: doc.owner_id,
          requesting_user: user.sub
        });
        throw new TRPCError({ code: 'FORBIDDEN', message: 'You do not own this document.' });
      }

      console.log('[AGENT] ✅ Ownership verified');

      // 2. Check if a negotiation for this document already exists
      console.log('[AGENT] Step 2/5: Checking for existing negotiations...');
      const { data: existingNegotiation, error: checkError } = await supabaseAdmin
        .from('negotiations')
        .select('id, status, counterparty_email, created_at')
        .eq('document_id', documentId)
        .maybeSingle();

      if (checkError) {
        console.error('[AGENT] ⚠️ Error checking existing negotiations:', checkError);
      }

      if (existingNegotiation) {
        console.error('[AGENT] ❌ CONFLICT: Negotiation already exists:', {
          negotiation_id: existingNegotiation.id,
          status: existingNegotiation.status,
          counterparty_email: existingNegotiation.counterparty_email,
          created_at: existingNegotiation.created_at,
          document_id: documentId
        });
        throw new TRPCError({
          code: 'CONFLICT',
          message: `A negotiation for this document has already been started. Negotiation ID: ${existingNegotiation.id}`
        });
      }

      console.log('[AGENT] ✅ No existing negotiation found, proceeding...');

      // 3. Create the negotiation record with status 'pending_initiation'
      console.log('[AGENT] Step 3/5: Creating negotiation record...');
      console.log('[AGENT] Negotiation data to insert:', {
        document_id: documentId,
        owner_id: user.sub,
        counterparty_email: counterpartyEmail,
        parameters: parameters
      });

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
        console.error('[AGENT] ❌ Error creating negotiation record:', {
          error: negError,
          code: negError.code,
          details: negError.details,
          hint: negError.hint
        });
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create negotiation record.' });
      }

      console.log('[AGENT] ✅ Negotiation created successfully:', {
        id: negotiation.id,
        status: negotiation.status,
        document_id: negotiation.document_id,
        counterparty_email: negotiation.counterparty_email,
        created_at: negotiation.created_at
      });

      // 4. Trigger the agent-backend to send the initial email
      console.log('[AGENT] Step 4/5: Triggering agent-backend...');
      const agentBackendUrl = process.env.AGENT_BACKEND_URL || 'http://localhost:3002';
      console.log('[AGENT] Agent backend URL:', agentBackendUrl);
      console.log('[AGENT] Webhook secret configured:', !!process.env.SUPABASE_WEBHOOK_SECRET);

      try {
        const requestUrl = `${agentBackendUrl}/jobs/start-negotiation`;
        console.log('[AGENT] Making POST request to:', requestUrl);

        const response = await fetch(requestUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_WEBHOOK_SECRET}`,
          },
          body: JSON.stringify({ record: negotiation }),
        });

        console.log('[AGENT] Agent-backend response status:', response.status, response.statusText);

        if (!response.ok) {
          const responseText = await response.text();
          console.error('[AGENT] ❌ Agent-backend returned error:', {
            status: response.status,
            statusText: response.statusText,
            body: responseText
          });
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to trigger negotiation agent. Status: ${response.status}`
          });
        }

        const responseData = await response.json();
        console.log('[AGENT] ✅ Agent-backend triggered successfully:', responseData);

      } catch (error) {
        console.error('[AGENT] ❌ Exception while triggering agent-backend:', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          negotiation_id: negotiation.id
        });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to trigger negotiation agent. Check server logs for details.'
        });
      }

      console.log('[AGENT] Step 5/5: Returning negotiation data...');
      console.log('[AGENT] ✅ START NEGOTIATION COMPLETE');
      console.log('='.repeat(80));

      return negotiation;
    }),

  /**
   * Fetches all negotiations owned by the current user.
   * Joins with the documents table to get the document name.
   */
  getAllNegotiations: protectedProcedure
    .query(async ({ ctx }) => {
      console.log('[AGENT] 📋 GET ALL NEGOTIATIONS - User:', ctx.user.sub);

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
        console.error('[AGENT] ❌ Error fetching negotiations:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch negotiations.' });
      }

      console.log('[AGENT] ✅ Found', data?.length || 0, 'negotiations');
      return data;
    }),

  /**
   * Fetches a single negotiation by its ID, enforcing RLS.
   */
  getNegotiationById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      console.log('[AGENT] 🔍 GET NEGOTIATION BY ID:', input.id, '- User:', ctx.user.sub);

      const { data, error } = await ctx.supabase
        .from('negotiations')
        .select('*')
        .eq('id', input.id)
        .single();

      if (error || !data) {
        console.error('[AGENT] ❌ Negotiation not found or access denied:', error);
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Negotiation not found or you do not have access.' });
      }

      console.log('[AGENT] ✅ Negotiation found:', {
        id: data.id,
        status: data.status,
        document_id: data.document_id
      });
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

      console.log('[AGENT] 📝 PROVIDE INSTRUCTIONS');
      console.log('[AGENT] Negotiation ID:', negotiationId);
      console.log('[AGENT] User ID:', ctx.user.sub);
      console.log('[AGENT] Instructions:', instructions);

      // 1. Verify ownership and that the negotiation is in 'escalated' state using RLS client
      console.log('[AGENT] Checking for escalated negotiation...');
      const { data: negotiation, error: negError } = await ctx.supabase
        .from('negotiations')
        .select('id, history, status')
        .eq('id', negotiationId)
        .eq('status', 'escalated')
        .single();

      if (negError || !negotiation) {
        console.error('[AGENT] ❌ Escalated negotiation not found:', negError);
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No escalated negotiation found with that ID that you own.' });
      }

      console.log('[AGENT] ✅ Found escalated negotiation:', {
        id: negotiation.id,
        current_status: negotiation.status,
        history_length: negotiation.history?.length || 0
      });

      // 2. Append the user's instructions to the history and reset status
      const newHistoryEntry = {
        role: 'user', // The owner providing instructions
        content: `New instructions provided: ${instructions}`,
        timestamp: new Date().toISOString(),
      };
      const updatedHistory = [...(negotiation.history || []), newHistoryEntry];

      console.log('[AGENT] Updating negotiation status to in_progress...');

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
        console.error('[AGENT] ❌ Error updating negotiation:', updateError);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update negotiation.' });
      }

      console.log('[AGENT] ✅ Negotiation updated:', {
        id: updatedNegotiation.id,
        new_status: updatedNegotiation.status,
        history_length: updatedNegotiation.history?.length || 0
      });

      // TODO: In a production system, you would trigger the agent backend here to
      // re-process this negotiation immediately, rather than waiting for the next email.
      // This could be a direct HTTP call or another Supabase Webhook on UPDATE.

      return updatedNegotiation;
    }),

  /**
   * Deletes a negotiation by ID. Owner only.
   * Useful for testing and resetting negotiations.
   */
  deleteNegotiation: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      console.log('[AGENT] 🗑️ DELETE NEGOTIATION');
      console.log('[AGENT] Negotiation ID:', input.id);
      console.log('[AGENT] User ID:', ctx.user.sub);

      // 1. Verify ownership using RLS
      const { data: negotiation, error: fetchError } = await ctx.supabase
        .from('negotiations')
        .select('id, owner_id, status, document_id')
        .eq('id', input.id)
        .single();

      if (fetchError || !negotiation) {
        console.error('[AGENT] ❌ Negotiation not found or access denied:', fetchError);
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Negotiation not found or you do not have access.' });
      }

      console.log('[AGENT] ✅ Found negotiation:', {
        id: negotiation.id,
        status: negotiation.status,
        document_id: negotiation.document_id
      });

      // 2. Delete using admin client after RLS check
      const { error: deleteError } = await supabaseAdmin
        .from('negotiations')
        .delete()
        .eq('id', input.id);

      if (deleteError) {
        console.error('[AGENT] ❌ Error deleting negotiation:', deleteError);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to delete negotiation.' });
      }

      console.log('[AGENT] ✅ Negotiation deleted successfully');
      return { success: true, id: input.id };
    }),
});