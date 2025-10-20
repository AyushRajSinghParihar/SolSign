import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

export function InviteDialog({ documentId, isOpen, onOpenChange }: { documentId: string, isOpen: boolean, onOpenChange: (isOpen: boolean) => void }) {
  const [email, setEmail] = useState('')
  const [wallet, setWallet] = useState('')
  const utils = trpc.useUtils()
  const inviteMutation = trpc.documents.inviteParty.useMutation({
    onSuccess: () => {
      utils.documents.getById.invalidate({ id: documentId })
    }
  })

  const handleSubmit = () => {
    toast.promise(inviteMutation.mutateAsync({ documentId, email, wallet }), {
      loading: 'Sending invitation...',
      success: () => {
        onOpenChange(false)
        return 'Invitation sent successfully!'
      },
      error: (err) => err.message,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Invite a New Signer</DialogTitle><DialogDescription>Enter the email and Solana wallet address of the person you want to invite.</DialogDescription></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="email" className="text-right">Email</Label><Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} className="col-span-3" /></div>
          <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="wallet" className="text-right">Wallet</Label><Input id="wallet" value={wallet} onChange={(e) => setWallet(e.target.value)} className="col-span-3" /></div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!email || !wallet || inviteMutation.isPending}>
            {inviteMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Invite'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}