import { describe, it, expect, vi, afterEach } from 'vitest'
import { documentsRouter } from './documents'
import { mockGenerateContent } from '@google/generative-ai'

// Helper to create a mock context for our tRPC procedures
const createMockContext = () => ({
  user: {
    sub: 'mock-user-uuid-12345', // A fake user ID
    // ... other user properties if needed
  },
})

describe('documentsRouter', () => {
  // Reset mocks after each test to ensure isolation
  afterEach(() => {
    vi.clearAllMocks()
  })

  // --- Testing the `autofill` procedure ---
  describe('autofill', () => {
    it('should construct a correct prompt and return parsed JSON', async () => {
      const caller = documentsRouter.createCaller(createMockContext())
      
      const mockInput = {
        templateFields: [{ label: 'Full Name', placeholder: '[Name]' }],
        vaultData: { fullName: 'John Doe' },
      }

      // Set the mock AI response for this specific test
      const mockAiResponse = { "Full Name": "John Doe" }
      mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => JSON.stringify(mockAiResponse) },
      })

      const result = await caller.autofill(mockInput)

      // 1. Verify that the AI was called
      expect(mockGenerateContent).toHaveBeenCalledOnce()

      // 2. Use a snapshot to verify the prompt's structure
      // This is powerful because if you change the prompt, the test will fail,
      // forcing you to review and approve the change.
      const promptSentToAi = mockGenerateContent.mock.calls[0][0]
      expect(promptSentToAi).toMatchSnapshot()
      
      // 3. Verify that the output is the parsed JSON from the mock
      expect(result).toEqual(mockAiResponse)
    })
  })

  // --- Testing the `checkForConflicts` procedure ---
  describe('checkForConflicts', () => {
    it('should construct a conflict check prompt and return an array of issues', async () => {
      const caller = documentsRouter.createCaller(createMockContext())
      
      const mockInput = {
        filledFields: {
          "Start Date": "2025-01-01",
          "End Date": "2024-01-01",
        },
      }

      const mockAiResponse = [{ field: "End Date", issue: "The end date occurs before the start date." }]
      mockGenerateContent.mockResolvedValueOnce({
        response: { text: () => JSON.stringify(mockAiResponse) },
      })
      
      const result = await caller.checkForConflicts(mockInput)

      // 1. Verify the AI was called
      expect(mockGenerateContent).toHaveBeenCalledOnce()

      // 2. Snapshot the prompt
      const promptSentToAi = mockGenerateContent.mock.calls[0][0]
      expect(promptSentToAi).toMatchSnapshot()

      // 3. Verify the output
      expect(result).toEqual(mockAiResponse)
    })

    it('should return an empty array when no conflicts are found', async () => {
        const caller = documentsRouter.createCaller(createMockContext())
        
        const mockInput = {
          filledFields: { "Start Date": "2024-01-01", "End Date": "2025-01-01" },
        }
  
        // Mock the AI returning an empty array
        const mockAiResponse: any[] = []
        mockGenerateContent.mockResolvedValueOnce({
          response: { text: () => JSON.stringify(mockAiResponse) },
        })
        
        const result = await caller.checkForConflicts(mockInput)
  
        expect(result).toEqual([])
      })
  })
})