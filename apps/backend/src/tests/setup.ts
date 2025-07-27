import { vi } from 'vitest'

// Mock the entire GoogleGenerativeAI library
vi.mock('@google/generative-ai', () => {
  // Mock the nested structure of the library
  const mockGenerateContent = vi.fn().mockResolvedValue({
    response: {
      text: () => JSON.stringify({ message: 'Mock AI Response' }),
    },
  })
  
  const mockGetGenerativeModel = vi.fn(() => ({
    generateContent: mockGenerateContent,
  }))

  const mockGoogleGenerativeAI = vi.fn(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  }))

  return {
    GoogleGenerativeAI: mockGoogleGenerativeAI,
    mockGenerateContent, // Export the mock function for individual tests to use
  }
})