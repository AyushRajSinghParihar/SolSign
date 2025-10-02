import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

// Define the validation schema for our form
const formSchema = z.object({
  counterpartyEmail: z.string().email({ message: "Please enter a valid email address." }),
  parameters: z.string().min(20, { message: "Please provide at least 20 characters of instructions." }),
})

type NegotiationModalProps = {
  documentId: string
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
}

export function NegotiationModal({ documentId, isOpen, onOpenChange }: NegotiationModalProps) {
  const startNegotiationMutation = trpc.agent.startNegotiation.useMutation()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      counterpartyEmail: '',
      parameters: '',
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    toast.promise(
      startNegotiationMutation.mutateAsync({
        documentId,
        counterpartyEmail: values.counterpartyEmail,
        // The backend expects a record, so we'll wrap the instructions in an object.
        // This matches the structured `parameters` schema we planned.
        parameters: { instructions: values.parameters },
      }),
      {
        loading: 'Initiating AI negotiation agent...',
        success: () => {
          onOpenChange(false); // Close modal on success
          form.reset(); // Reset the form for the next time it opens
          return 'Agent has been dispatched and will contact the counterparty shortly.';
        },
        error: (err) => `Failed to start negotiation: ${err.message}`,
      }
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Configure AI Negotiation Agent</DialogTitle>
          <DialogDescription>
            Set the parameters for your AI agent. It will contact the counterparty and negotiate on your behalf.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="counterpartyEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Counterparty's Email</FormLabel>
                  <FormControl>
                    <Input placeholder="client@company.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="parameters"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Negotiation Goals & Instructions</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., My minimum acceptable payment is $5,000. I cannot accept payment terms longer than 30 days. The liability clause is non-negotiable."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide clear, specific instructions for your agent.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={startNegotiationMutation.isPending}>
                {startNegotiationMutation.isPending ? 'Initiating...' : 'Start Negotiation'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}