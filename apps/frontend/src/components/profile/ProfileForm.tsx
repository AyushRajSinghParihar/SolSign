import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { trpc } from '@/lib/trpc'
import { toast } from 'sonner'
import type { RouterOutputs } from '@repo/api'
import { Loader2 } from 'lucide-react'

type UserProfile = RouterOutputs['user']['getProfile']

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
})

export function ProfileForm({ userProfile }: { userProfile: UserProfile }) {
  const utils = trpc.useUtils()
  const updateEmailMutation = trpc.user.updateEmail.useMutation({
    onSuccess: () => {
      // When the mutation is successful, invalidate the getProfile query to refetch fresh data
      utils.user.getProfile.invalidate()
    }
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: userProfile.email || '',
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    toast.promise(updateEmailMutation.mutateAsync(values), {
      loading: 'Updating email...',
      success: 'Your email has been updated successfully!',
      error: (err) => err.message,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Settings</CardTitle>
        <CardDescription>
          Your wallet address is your permanent identifier. You can set an email for notifications.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <Label>Wallet Address</Label>
          <p className="text-sm text-muted-foreground font-mono break-all">
            {userProfile.wallet_address}
          </p>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormDescription>
                    We'll send an email here when your documents are minted.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={updateEmailMutation.isPending}>
              {updateEmailMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}