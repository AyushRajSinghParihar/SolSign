import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { trpc } from '@/lib/trpc'
import { encryptData } from '@/lib/crypto'

const formSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name is required.' }),
  homeAddress: z.string().min(5, { message: 'Home address is required.' }),
})

type VaultFormProps = {
  onSuccess: () => void
  getKey: () => Promise<CryptoKey>
}

export function VaultForm({ onSuccess, getKey }: VaultFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      homeAddress: '',
    },
  })

  const createItemMutation = trpc.vault.createItem.useMutation()

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const key = await getKey()
      const ciphertext = await encryptData(key, values)

      await createItemMutation.mutateAsync({
        type: 'personal_info',
        ciphertext,
      })

      form.reset()
      onSuccess() // Refetch the list of items
    } catch (error) {
      console.error('Failed to create vault item:', error)
      // You can show a toast notification here
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Personal Info</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="homeAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Home Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main St, Anytown, USA" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={createItemMutation.isPending}>
              {createItemMutation.isPending ? 'Saving...' : 'Save to Vault'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
