import { useParams } from 'react-router-dom'
import { trpc } from '@/lib/trpc'
import { DocumentViewer } from '@/components/document/DocumentViewer'
import { DocumentForm } from '@/components/document/DocumentForm'
import { Card, CardContent } from '@/components/ui/card'
import ReactMarkdown from 'react-markdown'
import { DocumentActions } from '@/components/document/DocumentActions'
import { useState, useEffect } from 'react'
import type { RouterOutputs } from '@repo/api'

export function DocumentPage() {
  const { id } = useParams<{ id: string }>()
  // Local state to manage document status changes
  const [document, setDocument] = useState<RouterOutputs['documents']['getById'] | null>(null)

  const getDocumentQuery = trpc.documents.getById.useQuery({ id: id! }, {
    enabled: !!id,
  })

  useEffect(() => {
    if (getDocumentQuery.data) {
      setDocument(getDocumentQuery.data) // Sync local state with fetched data
    }
  }, [getDocumentQuery.data])

  if (getDocumentQuery.isLoading || !document) {
    return <div>Loading document...</div>
  }
  if (getDocumentQuery.isError) {
    return <div>Error: {getDocumentQuery.error.message}</div>
  }

  const template = document.template

  // --- THIS IS THE UNIFIED LAYOUT ---
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex-grow grid md:grid-cols-2 gap-8 overflow-y-auto p-1">
        {/* Left Panel: Always shows the visual document */}
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

        {/* Right Panel: Shows context and metadata */}
        <div>
          <h1 className="text-3xl font-bold mb-2">{document.name}</h1>
          <p className="text-muted-foreground mb-6">
            {template 
              ? "Review the document and fill in the required fields."
              : "Review the AI-generated document below before signing."
            }
          </p>
          {/* If it's a template, show the interactive form */}
          {template && <DocumentForm document={document} template={template} />}
        </div>
      </div>

      {/* Footer: Always show the action buttons */}
      <DocumentActions
        document={document}
        // For AI docs, the `content` is what's signed. For templates, the form handles it.
        contentToSign={template ? document.filled_data_json || {} : document.content || ''}
        onStatusChange={setDocument}
      />
    </div>
  )
}
