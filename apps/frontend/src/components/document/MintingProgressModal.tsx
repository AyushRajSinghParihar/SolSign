import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '../ui/button'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'

// Define the possible states for our modal
type MintingState = 
  | { status: 'idle' }
  | { status: 'loading'; message: string }
  | { status: 'success'; solanaTx: string; arweaveTx: string }
  | { status: 'error'; message: string }

type MintingProgressModalProps = {
  state: MintingState
  onClose: () => void
}

export function MintingProgressModal({ state, onClose }: MintingProgressModalProps) {
  const isOpen = state.status !== 'idle'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()} // Prevent closing on outside click
        showCloseButton={state.status !== 'loading'} // Hide close button while loading
      >
        <DialogHeader>
          <DialogTitle>Finalizing & Minting Document</DialogTitle>
          <DialogDescription>
            This process involves several on-chain transactions and may take a minute. Please do not close this window.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {state.status === 'loading' && (
            <div className="flex items-center space-x-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">{state.message}</p>
            </div>
          )}

          {state.status === 'success' && (
            <Alert variant="default" className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Minting Successful!</AlertTitle>
              <AlertDescription className="text-green-700 space-y-2">
                <p>Your document is now permanently recorded on the blockchain.</p>
                <div className="flex flex-col space-y-1">
                  <a
                    href={`https://explorer.solana.com/tx/${state.solanaTx}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    View Solana Transaction &rarr;
                  </a>
                  <a
                    href={`https://devnet.irys.xyz/${state.arweaveTx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    View on irys &rarr;
                  </a>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {state.status === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>An Error Occurred</AlertTitle>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}
        </div>

        {state.status !== 'loading' && (
          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}