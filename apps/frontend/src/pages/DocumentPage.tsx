import { useParams } from 'react-router-dom'
import { trpc } from '@/lib/trpc'
import { DocumentViewer } from '@/components/document/DocumentViewer'
import { DocumentForm } from '@/components/document/DocumentForm'
import { Card, CardContent } from '@/components/ui/card'
import ReactMarkdown from 'react-markdown'
import { DocumentActions } from '@/components/document/DocumentActions'
import { useState, useEffect } from 'react'
import type { RouterOutputs } from '@repo/api'
import { PartyList } from '@/components/document/PartyList'
import { InviteDialog } from '@/components/document/InviteDialog'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { NegotiationModal } from '@/components/negotiation/NegotiationModal'
import { ExplainClauseModal } from '@/components/document/ExplainClauseModal'
import { TextSelectionToolbar } from '@/components/document/TextSelectionToolbar'

export function DocumentPage() {
  const { id } = useParams<{ id: string }>()
  const [document, setDocument] = useState<RouterOutputs['documents']['getById'] | null>(null)
  const [isInviteOpen, setInviteOpen] = useState(false)
  const { user: currentUser } = useAuth()
  const [isNegotiationModalOpen, setNegotiationModalOpen] = useState(false)
  const [explainModalOpen, setExplainModalOpen] = useState(false)
  const [selectedClauseText, setSelectedClauseText] = useState('')

  const handleExplainRequest = (text: string) => {
    setSelectedClauseText(text)
    setExplainModalOpen(true)
  }

  const getDocumentQuery = trpc.documents.getById.useQuery(
    { id: id! },
    {
      enabled: !!id,
      retry: false, // Don't retry if RLS blocks it
    }
  )

  useEffect(() => {
    if (getDocumentQuery.data) {
      setDocument(getDocumentQuery.data)
    }
  }, [getDocumentQuery.data])

  // Loading state
  if (getDocumentQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading document...</p>
        </div>
      </div>
    )
  }

  // Error state (including RLS blocks)
  if (getDocumentQuery.isError) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)] p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            {getDocumentQuery.error.message || 
             "You don't have permission to view this document. Only the document owner and invited signers can access it."}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Document not found or RLS filtered it out
  if (!document) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)] p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Document Not Found</AlertTitle>
          <AlertDescription>
            This document doesn't exist or you don't have permission to access it.
            Please check the link and try again.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Additional security check on the frontend
  const isOwner = currentUser?.id === document.owner_id
  const isParty = document.parties?.some(
    (party: { wallet?: string }) => party.wallet === currentUser?.wallet_address
  )

  if (!isOwner && !isParty) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)] p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unauthorized Access</AlertTitle>
          <AlertDescription>
            You are not authorized to view this document. Only the document owner 
            and invited parties can access it.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const template = document.template
  // The document is considered "locked" if it's signed or minted.
  const isLocked = document.status === 'signed' || document.status === 'minted'

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        <div className="flex-grow grid md:grid-cols-2 gap-8 overflow-y-auto p-1">
          {/* Left Panel: Visual Document */}
          <div className="h-full">
            {template ? (
              <DocumentViewer storagePath={template.storage_path} />
            ) : (
              <div className="relative h-full">
                <TextSelectionToolbar onExplain={handleExplainRequest} />
                <Card className="h-full overflow-y-auto">
                  <CardContent className="prose dark:prose-invert max-w-none p-6 break-words">
                    {document.content ? (
                      <ReactMarkdown>{document.content}</ReactMarkdown>
                    ) : (
                      <p className="text-muted-foreground">No content available for this document.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Right Panel: All metadata and forms in a single scrolling container */}
          <div className="h-full overflow-y-auto space-y-6">
            <h1 className="text-3xl font-bold break-words overflow-wrap-anywhere">{document.name}</h1>
            <p className="text-muted-foreground">
              {template
                ? 'Review the document and fill in the required fields.'
                : 'Review the AI-generated document below before signing.'}
            </p>

            {/* Party list and invite button */}
            <PartyList parties={document.parties} />
            <div className="flex flex-wrap gap-4"> {/* Use flex-wrap for better responsiveness */}
              {isOwner && !isLocked && (
                <Button variant="outline" onClick={() => setInviteOpen(true)}>Invite Signer</Button>
              )}
              {isOwner && document.status === 'draft' && (
                  <Button onClick={() => setNegotiationModalOpen(true)}>
                    Negotiate via AI Agent
                  </Button>
                )}
            </div>

            {/* Document form */}
            {template && <DocumentForm document={document} template={template} />}
          </div>
        </div>

        {/* Footer: Actions */}
        <DocumentActions
          document={document}
          contentToSign={template ? document.filled_data_json || {} : document.content || ''}
          onStatusChange={setDocument}
        />
      </div>

      <NegotiationModal
        documentId={document.id}
        isOpen={isNegotiationModalOpen}
        onOpenChange={setNegotiationModalOpen}
      />

      <InviteDialog
        documentId={document.id}
        isOpen={isInviteOpen}
        onOpenChange={setInviteOpen}
      />

      <ExplainClauseModal
        clauseText={selectedClauseText}
        isOpen={explainModalOpen}
        onOpenChange={setExplainModalOpen}
      />
    </>
  )
}