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
        // z.record now requires a key type (z.string()) and a value type (z.any()).
        vaultData: z.record(z.string(), z.any()),
      }),
    )
    .mutation(async ({ input }) => {
      const { templateFields, vaultData } = input

      const prompt = `
        You are an intelligent document autofill assistant.
        Your task is to map the user's personal data to the required fields of a document template.
        
        DOCUMENT TEMPLATE FIELDS:
        ${JSON.stringify(templateFields, null, 2)}

        USER'S PERSONAL DATA VAULT:
        ${JSON.stringify(vaultData, null, 2)}

        Based on the user's data, fill in the values for the template fields.
        Use your best judgment to match fields like "Full Name" to "fullName" or "Home Address" to "address".
        If a value for a field cannot be found in the user's data, use an empty string "" as the value.

        Respond ONLY with a JSON object that is a direct key-value map of the field labels to their corresponding values.
        Example format:
        {
          "Disclosing Party Name": "John Doe",
          "Effective Date": ""
        }
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
        // z.record now requires a key type (z.string()) and a value type (z.string()).
        filledFields: z.record(z.string(), z.string()),
      }),
    )
    .mutation(async ({ input }) => {
      const { filledFields } = input
      
      const prompt = `
        You are a smart legal assistant that checks for logical errors in contract data.
        Analyze the following key-value data from a document for any logical inconsistencies, conflicts, or ambiguities.
        For example, check if a start date is after an end date, if a name is repeated for different roles, or if a number seems out of place.

        DOCUMENT DATA:
        ${JSON.stringify(filledFields, null, 2)}

        Respond ONLY with a JSON array of issues found. Each issue should be an object with "field" and "issue" keys.
        If no issues are found, you MUST return an empty array [].

        Example of a response with issues:
        [
          { "field": "End Date", "issue": "The end date occurs before the start date." },
          { "field": "Disclosing Party", "issue": "This name is the same as the Receiving Party, which might be an error." }
        ]

        Example of a response with no issues:
        []
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
    })
})