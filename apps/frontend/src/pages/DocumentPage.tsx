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

export function DocumentPage() {
  const { id } = useParams<{ id: string }>()
  const [document, setDocument] = useState<RouterOutputs['documents']['getById'] | null>(null)
  const [isInviteOpen, setInviteOpen] = useState(false)
  const { user: currentUser } = useAuth()

  const getDocumentQuery = trpc.documents.getById.useQuery(
    { id: id! },
    {
      enabled: !!id,
      onSuccess: (data) => {
        setDocument(data)
      },
    }
  )

  useEffect(() => {
    if (getDocumentQuery.data) {
      setDocument(getDocumentQuery.data)
    }
  }, [getDocumentQuery.data])

  if (getDocumentQuery.isLoading || !document) {
    return <div>Loading document...</div>
  }
  if (getDocumentQuery.isError) {
    return <div>Error: {getDocumentQuery.error.message}</div>
  }

  const template = document.template
  const isOwner = currentUser?.id === document.owner_id

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        <div className="flex-grow grid md:grid-cols-2 gap-8 overflow-y-auto p-1">
          {/* Left Panel: Visual Document */}
          <div className="h-full">
            {template ? (
              <DocumentViewer storagePath={template.storage_path} />
            ) : (
              <Card className="h-full overflow-y-auto">
                <CardContent className="prose dark:prose-invert max-w-none p-6">
                  <ReactMarkdown>{document.content || ''}</ReactMarkdown>
                </CardContent>
              </Card>
            )}
          </div>

          {/* --- THIS IS THE FIX --- */}
          {/* Right Panel: All metadata and forms in a single scrolling container */}
          <div className="h-full overflow-y-auto space-y-6">
            <h1 className="text-3xl font-bold">{document.name}</h1>
            <p className="text-muted-foreground">
              {template
                ? 'Review the document and fill in the required fields.'
                : 'Review the AI-generated document below before signing.'}
            </p>

            {/* Party list and invite button are now inside the scrolling container */}
            <PartyList parties={document.parties} />
            {isOwner && document.status === 'draft' && (
              <Button onClick={() => setInviteOpen(true)}>Invite Signer</Button>
            )}

            {/* The form is now a sibling, not a replacement */}
            {template && <DocumentForm document={document} template={template} />}
          </div>
          {/* --- END OF FIX --- */}
        </div>

        {/* Footer: Actions */}
        <DocumentActions
          document={document}
          contentToSign={template ? document.filled_data-json || {} : document.content || ''}
          onStatusChange={setDocument}
        />
      </div>

      <InviteDialog
        documentId={document.id}
        isOpen={isInviteOpen}
        onOpenChange={setInviteOpen}
      />
    </>
  )
}