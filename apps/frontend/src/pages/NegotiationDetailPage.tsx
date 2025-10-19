import { useParams } from 'react-router-dom'
import { trpc } from '@/lib/trpc'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'

const instructionSchema = z.object({
  instructions: z.string().min(10, "Please provide detailed instructions."),
});

export function NegotiationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const getNegotiationQuery = trpc.agent.getNegotiationById.useQuery({ id: id! })
  const provideInstructionsMutation = trpc.agent.provideInstructions.useMutation()
  const utils = trpc.useUtils()

  const form = useForm<z.infer<typeof instructionSchema>>({
    resolver: zodResolver(instructionSchema),
    defaultValues: { instructions: '' },
  })

  const onSubmit = (values: z.infer<typeof instructionSchema>) => {
    toast.promise(
      provideInstructionsMutation.mutateAsync({ negotiationId: id!, ...values }),
      {
        loading: 'Sending instructions to agent...',
        success: () => {
          utils.agent.getNegotiationById.invalidate({ id: id! })
          form.reset()
          return 'Instructions sent! The agent will now resume.'
        },
        error: (err) => err.message,
      }
    )
  }

  const negotiation = getNegotiationQuery.data

  if (getNegotiationQuery.isLoading) return <div>Loading negotiation...</div>
  if (!negotiation) return <div>Negotiation not found.</div>

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Negotiation Details</h1>
          <p className="text-muted-foreground">
            <strong>You're negotiating with:</strong> {negotiation.counterparty_email}<br/>
            <strong>AI Agent Status:</strong> {negotiation.status === 'escalated' ? 'Waiting for your input' : 'Actively negotiating'}
          </p>
        </div>
        <Badge className="text-lg">{negotiation.status}</Badge>
      </div>

      {/* Escalation UI */}
      {negotiation.status === 'escalated' && (
        <Card className="border-yellow-500">
          <CardHeader>
            <CardTitle className="text-yellow-600">Action Required</CardTitle>
            <CardDescription>The AI agent has escalated this negotiation and requires your input to proceed.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <Textarea {...form.register('instructions')} placeholder="e.g., 'Accept the offer if they agree to a 20-day payment term, otherwise hold firm at $5000.'" />
              <Button type="submit" disabled={provideInstructionsMutation.isPending}>
                {provideInstructionsMutation.isPending ? 'Sending...' : 'Provide Instructions'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Chat History UI */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Conversation History</h2>
        {negotiation.history.map((entry, index) => {
          // Create clearer labels
          let displayRole = entry.role;
          let displayBgColor = 'bg-muted';
          let displayAlignment = 'justify-start';
          
          if (entry.role === 'owner') {
            displayRole = 'You (Document Owner)';
            displayBgColor = 'bg-blue-100 dark:bg-blue-900';
            displayAlignment = 'justify-end';
          } else if (entry.role === 'agent') {
            displayRole = 'AI Agent (representing you)';
            displayBgColor = 'bg-primary text-primary-foreground';
            displayAlignment = 'justify-end';
          } else if (entry.role === 'counterparty') {
            displayRole = `Counterparty (${negotiation.counterparty_email})`;
            displayBgColor = 'bg-muted';
            displayAlignment = 'justify-start';
          }
          
          return (
            <div key={index} className={`flex ${displayAlignment}`}>
              <div className={`max-w-lg p-4 rounded-lg ${displayBgColor}`}>
                <p className="font-bold">{displayRole}</p>
                <p className="whitespace-pre-wrap">{entry.content}</p>
                <p className="text-xs opacity-70 mt-2">{new Date(entry.timestamp).toLocaleString()}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  )
}