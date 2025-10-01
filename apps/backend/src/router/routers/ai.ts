import { z } from 'zod'
import { protectedProcedure, t } from '../context'
import { TRPCError } from '@trpc/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabaseAdmin } from '../../lib/supabase'

// --- AI CONFIGURATION ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
if (!GEMINI_API_KEY) {
  throw new Error('Missing environment variable GEMINI_API_KEY for backend')
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

export const aiRouter = t.router({
  /**
   * Takes a user's initial contract idea and returns a list of
   * clarifying questions to gather more details.
   */
  generateContractFromPrompt: protectedProcedure
    .input(
      z.object({
        prompt: z.string().min(10, 'Prompt must be at least 10 characters long.'),
      }),
    )
    .mutation(async ({ input }) => {
      const { prompt } = input

      const generationPrompt = `
        You are a legal assistant AI. A user wants to draft a contract based on the following request: "${prompt}".

        To ensure the contract is complete and robust, what are 3-5 essential clarifying questions you need to ask the user? These questions should cover key details like names, dates, amounts, jurisdictions, and specific terms.

        Respond ONLY with a valid JSON object in the following format: { "questions": ["question 1", "question 2", "question 3"] }. Do not include any other text, explanations, or markdown formatting.
      `
      
      try {
        console.log('[AI] Generating clarifying questions...')
        const result = await model.generateContent(generationPrompt)
        const responseText = result.response.text()
        const jsonString = responseText.replace(/```json\n|```/g, '').trim()
        
        const parsed = JSON.parse(jsonString) as { questions: string[] }
        
        // Validate the structure of the AI's response
        if (!parsed.questions || !Array.isArray(parsed.questions)) {
            throw new Error("AI returned an invalid format for questions.");
        }

        console.log('[AI] Successfully generated questions:', parsed.questions)
        return parsed.questions // Return just the array of strings
      } catch (error) {
        console.error('Error during AI question generation:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `AI failed to generate questions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })
      }
    }),

  /**
   * Takes the original prompt and answers to clarifying questions,
   * generates the final contract text, and saves it as a new document.
   */
  finalizeContract: protectedProcedure
    .input(
      z.object({
        originalPrompt: z.string(),
        answers: z.record(z.string(), z.string()), // e.g., { "What is the deadline?": "Dec 31, 2025" }
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { originalPrompt, answers } = input
      const { user } = ctx

      const finalizationPrompt = `
        You are a legal contract drafting AI. Your task is to generate a complete, professional legal document.

        The user's original request was: "${originalPrompt}".

        Based on that request, I asked the following clarifying questions, and the user provided these answers:
        ${JSON.stringify(answers, null, 2)}

        Now, using all of this information, draft a complete and well-formatted legal contract. The contract should be written in Markdown format. Ensure it includes all necessary clauses, standard legal boilerplate, and clear signature lines for all parties mentioned.
      `

      try {
        console.log('[AI] Generating final contract text...')
        const result = await model.generateContent(finalizationPrompt)
        const contractContent = result.response.text()

        if (!contractContent) {
            throw new Error("AI returned an empty contract.");
        }
        console.log('[AI] Successfully generated contract text.')

        // Save the new document to the database
        const documentName = `AI: ${originalPrompt.substring(0, 40)}...`
        const { data: newDocument, error: dbError } = await supabaseAdmin
          .from('documents')
          .insert({
            owner_id: user.sub,
            name: documentName,
            status: 'draft',
            content: contractContent, // Save the generated Markdown here
          })
          .select()
          .single()

        if (dbError) {
          throw new Error(`Database error: ${dbError.message}`)
        }
        
        console.log(`[DB] Successfully saved new document with ID: ${newDocument.id}`)
        return newDocument // Return the full document object

      } catch (error) {
        console.error('Error during AI contract finalization:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `AI failed to finalize contract: ${error instanceof Error ? error.message : 'Unknown error'}`,
        })
      }
    }),
})