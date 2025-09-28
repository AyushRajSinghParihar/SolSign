import { useWallet } from '@solana/wallet-adapter-react'
import { Button } from '../ui/button'
import { toast } from 'sonner'
import sha256 from 'tiny-sha256'
import { trpc } from '@/lib/trpc'
import type { RouterOutputs } from '@repo/api'
import { MintingProgressModal } from './MintingProgressModal'
import { useState } from 'react'

type Document = RouterOutputs['documents']['getById']
type MintingState = React.ComponentProps<typeof MintingProgressModal>['state']

type DocumentActionsProps = {
  document: Document;
  // The content to be signed/hashed. For templates, it's the form data. For AI docs, it's the markdown content.
  contentToSign: Record<string, string> | string;
  onStatusChange: (newDocument: Document) => void;
}

export function DocumentActions({ document, contentToSign, onStatusChange }: DocumentActionsProps) {
  const { signMessage } = useWallet()
  const [mintingState, setMintingState] = useState<MintingState>({ status: 'idle' });

  const signMutation = trpc.documents.sign.useMutation()
  const finalizeAndMintMutation = trpc.documents.finalizeAndMint.useMutation()

  const handleSignDocument = async () => {
    if (!signMessage) return toast.error('Wallet not connected.')
    if (!contentToSign || (typeof contentToSign === 'object' && Object.keys(contentToSign).length === 0)) {
      return toast.error('Cannot sign an empty document. Please fill out the fields or generate content.');
    }

    // Create a stable hash regardless of content type
    const contentString = typeof contentToSign === 'string' ? contentToSign : JSON.stringify(contentToSign, Object.keys(contentToSign).sort())
    const documentHash = sha256(new TextEncoder().encode(contentString))

    const messageToSign = `I am signing document "${document.name}" with the content hash: ${documentHash}`
    await signMessage(new TextEncoder().encode(messageToSign))

    toast.promise(signMutation.mutateAsync({ documentId: document.id, documentHash }), {
      loading: 'Recording signature...',
      success: (updatedDocument) => {
        onStatusChange(updatedDocument) // Update parent state
        return 'Document signed successfully!'
      },
      error: (err) => `Failed to sign: ${err.message}`,
    })
  }

  const handleFinalizeAndMint = async () => {
    setMintingState({ status: 'loading', message: 'Initiating on-chain process...' })
    try {
      const result = await finalizeAndMintMutation.mutateAsync({ documentId: document.id })
      setMintingState({ status: 'success', solanaTx: result.solanaTx, arweaveTx: result.arweaveTx })
      // Invalidate queries to refetch data globally
      // utils.documents.getById.invalidate({ id: document.id })
    } catch (error) {
      setMintingState({ status: 'error', message: error instanceof Error ? error.message : 'An unknown error occurred.' })
    }
  }

  return (
    <>
      <MintingProgressModal
        state={mintingState}
        onClose={() => setMintingState({ status: 'idle' })}
      />
      <div className="flex justify-end gap-4 p-4 border-t">
        {document.status === 'draft' && (
          <Button onClick={handleSignDocument} disabled={signMutation.isPending}>
            {signMutation.isPending ? 'Signing...' : 'Sign Document'}
          </Button>
        )}
        {document.status === 'signed' && (
          <Button onClick={handleFinalizeAndMint} disabled={finalizeAndMintMutation.isPending}>
            {finalizeAndMintMutation.isPending ? 'Minting...' : 'Finalize & Mint NFT'}
          </Button>
        )}
      </div>
    </>
  )
}