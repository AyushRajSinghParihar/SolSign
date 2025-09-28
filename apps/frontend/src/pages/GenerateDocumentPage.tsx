import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { trpc } from '@/lib/trpc'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

// Define the states for our multi-step UI
type GenerationStep = 'prompt' | 'questions' | 'loading'
type Answers = Record<string, string>

export function GenerateDocumentPage() {
  const navigate = useNavigate()
  
  // State management for the multi-step flow
  const [step, setStep] = useState<GenerationStep>('prompt')
  const [prompt, setPrompt] = useState('')
  const [questions, setQuestions] = useState<string[]>([])
  const [answers, setAnswers] = useState<Answers>({})

  // tRPC mutations for the two AI calls
  const generateQuestionsMutation = trpc.ai.generateContractFromPrompt.useMutation()
  const finalizeContractMutation = trpc.ai.finalizeContract.useMutation()

  const handleGenerateQuestions = () => {
    const promise = generateQuestionsMutation.mutateAsync({ prompt })
    
    toast.promise(promise, {
      loading: 'AI is analyzing your request...',
      success: (generatedQuestions) => {
        setQuestions(generatedQuestions)
        // Initialize answers object with empty strings
        setAnswers(generatedQuestions.reduce((acc, q) => ({ ...acc, [q]: '' }), {}))
        setStep('questions')
        return 'Please answer the clarifying questions below.'
      },
      error: (err) => err.message,
    })
  }

  const handleFinalizeContract = () => {
    const promise = finalizeContractMutation.mutateAsync({ originalPrompt: prompt, answers })

    toast.promise(promise, {
      loading: 'AI is drafting your contract...',
      success: (newDocument) => {
        navigate(`/documents/${newDocument.id}`)
        return 'Your new document is ready!'
      },
      error: (err) => err.message,
    })
  }

  const handleAnswerChange = (question: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [question]: answer }))
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Generate a New Document with AI</CardTitle>
          <CardDescription>
            Describe the contract you need, and our AI assistant will guide you through the process.
          </CardDescription>
        </CardHeader>

        {/* Step 1: The Initial Prompt */}
        {step === 'prompt' && (
          <>
            <CardContent>
              <Label htmlFor="prompt">Describe your document</Label>
              <Textarea
                id="prompt"
                placeholder="e.g., A freelance contract for a web developer named Alice to build a website for Bob Corp for $5000."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={5}
              />
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleGenerateQuestions}
                disabled={prompt.length < 10 || generateQuestionsMutation.isPending}
              >
                {generateQuestionsMutation.isPending ? 'Analyzing...' : 'Generate Questions'}
              </Button>
            </CardFooter>
          </>
        )}

        {/* Step 2: Answering the AI's Questions */}
        {step === 'questions' && (
          <>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Your Original Prompt:</h3>
                <p className="text-sm text-muted-foreground p-3 bg-secondary rounded-md">{prompt}</p>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold">Please provide these details:</h3>
                {questions.map((q) => (
                  <div key={q}>
                    <Label htmlFor={q}>{q}</Label>
                    <Input
                      id={q}
                      value={answers[q] || ''}
                      onChange={(e) => handleAnswerChange(q, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleFinalizeContract}
                disabled={finalizeContractMutation.isPending}
              >
                {finalizeContractMutation.isPending ? 'Drafting...' : 'Finalize Contract'}
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  )
}