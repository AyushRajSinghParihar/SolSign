import { z } from 'zod'
import { protectedProcedure, t } from '../context'
import { supabaseAdmin } from '../../lib/supabase'
import { TRPCError } from '@trpc/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// --- AI CONFIGURATION ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
if (!GEMINI_API_KEY) {
  throw new Error('Missing environment variable GEMINI_API_KEY for backend')
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

export const documentsRouter = t.router({
  /**
   * Creates a new document instance from a template for the user.
   */
  create: protectedProcedure
    .input(
      z.object({
        templateId: z.string().uuid(),
        name: z.string().min(1, 'Document name is required.'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx
      const { templateId, name } = input

      const { data, error } = await supabaseAdmin
        .from('documents')
        .insert({
          template_id: templateId,
          owner_id: user.sub,
          name,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating document:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Could not create document.',
        })
      }
      return data
    }),

  /**
   * Gets a single document by its ID, including its template.
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const { id } = input
      const { data, error } = await supabaseAdmin
        .from('documents')
        .select(`
          *,
          template:templates (*)
        `)
        .eq('id', id)
        .single()

      if (error) {
        console.error(`Error fetching document ${id}:`, error)
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found.' })
      }
      return data
    }),

  /**
   * Uses AI to map a user's vault data to a template's fields.
   */
  autofill: protectedProcedure
    .input(
      z.object({
        templateFields: z.array(z.object({ label: z.string(), placeholder: z.string() })),
        vaultData: z.record(z.string(), z.any()),
      }),
    )
    .mutation(async ({ input }) => {
      const { templateFields, vaultData } = input

      const prompt = `
        You are an intelligent document autofill assistant. Your task is to map the user's personal data to the required fields of a document template.
        DOCUMENT TEMPLATE FIELDS: ${JSON.stringify(templateFields, null, 2)}
        USER'S PERSONAL DATA VAULT: ${JSON.stringify(vaultData, null, 2)}
        Based on the user's data, fill in the values for the template fields. Use your best judgment to match fields. If a value cannot be found, use an empty string "".
        Respond ONLY with a JSON object that is a direct key-value map of the field labels to their corresponding values. Example: { "Disclosing Party Name": "John Doe", "Effective Date": "" }
      `
      try {
        const result = await model.generateContent(prompt)
        const responseText = result.response.text()
        const jsonString = responseText.replace(/```json\n|```/g, '').trim()
        return JSON.parse(jsonString)
      } catch (error) {
        console.error('Error during AI autofill:', error)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'AI autofill failed.' })
      }
    }),
    
  /**
   * Uses AI to check for logical conflicts in filled document data.
   */
  checkForConflicts: protectedProcedure
    .input(
      z.object({
        filledFields: z.record(z.string(), z.string()),
      }),
    )
    .mutation(async ({ input }) => {
      const { filledFields } = input
      
      const prompt = `
        You are a smart legal assistant. Analyze the following contract data for logical inconsistencies.
        DOCUMENT DATA: ${JSON.stringify(filledFields, null, 2)}
        Respond ONLY with a JSON array of issues found. Each issue should be an object with "field" and "issue" keys.
        If no issues are found, you MUST return an empty array [].
        Example with issues: [ { "field": "End Date", "issue": "The end date occurs before the start date." } ]
        Example with no issues: []
      `
      try {
        const result = await model.generateContent(prompt)
        const responseText = result.response.text()
        const jsonString = responseText.replace(/```json\n|```/g, '').trim()
        return JSON.parse(jsonString)
      } catch (error) {
        console.error('Error during AI conflict check:', error)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'AI conflict check failed.' })
      }
    }),

  /**
   * Saves the current filled data of a document.
   */
  save: protectedProcedure
    .input(
      z.object({
        documentId: z.string().uuid(),
        filledData: z.record(z.string(), z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx
      const { documentId, filledData } = input

      const { data, error } = await supabaseAdmin
        .from('documents')
        .update({ 
          filled_data_json: filledData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId)
        .eq('owner_id', user.sub)
        .select()
        .single()

      if (error) {
        console.error('Error saving document:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Could not save document draft.',
        })
      }
      return data
    }),

  /**
   * Records a signature for a document and updates its status.
   */
  sign: protectedProcedure
    .input(
      z.object({
        documentId: z.string().uuid(),
        documentHash: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx
      const { documentId, documentHash } = input

      // Step 1: Insert the signature record
      const { error: signatureError } = await supabaseAdmin
        .from('signatures')
        .insert({
          document_id: documentId,
          signer_id: user.sub,
          signature_hash: documentHash,
        })

      if (signatureError) {
        console.error('Error creating signature record:', signatureError)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Could not record signature.',
        })
      }
      
      // Step 2: Update the document status to "signed"
      const { data: updatedDocument, error: updateError } = await supabaseAdmin
        .from('documents')
        .update({ 
          status: 'signed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId)
        .eq('owner_id', user.sub)
        .select()
        .single()
      
      if (updateError) {
        console.error('Error updating document status after signing:', updateError)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Could not update document status.',
        })
      }

      return updatedDocument
    }),
})