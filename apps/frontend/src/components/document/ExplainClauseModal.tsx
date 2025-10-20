import { useEffect } from 'react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface ExplainClauseModalProps {
  clauseText: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function ExplainClauseModal({ clauseText, isOpen, onOpenChange }: ExplainClauseModalProps) {
  const explainMutation = trpc.ai.explainClause.useMutation()

  // Auto-trigger on open
  useEffect(() => {
    if (isOpen && clauseText) {
      explainMutation.mutate({ clauseText })
    }
  }, [isOpen, clauseText])

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Clause Explanation
          </DialogTitle>
          <DialogDescription>
            Get a plain-language explanation of legal text
          </DialogDescription>
        </DialogHeader>

        {/* Selected text preview */}
        <div className="bg-muted p-4 rounded-md">
          <p className="text-sm font-medium mb-2">Selected Text:</p>
          <p className="text-sm italic text-muted-foreground">
            {clauseText.length > 200 ? `${clauseText.substring(0, 200)}...` : clauseText}
          </p>
        </div>

        {/* Explanation content */}
        {explainMutation.isPending && (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        )}

        {explainMutation.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {explainMutation.error.message || 'Failed to generate explanation. Please try again.'}
            </AlertDescription>
          </Alert>
        )}

        {explainMutation.isSuccess && (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{explainMutation.data.explanation}</ReactMarkdown>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

