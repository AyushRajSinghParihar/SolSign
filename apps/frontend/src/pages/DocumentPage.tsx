import { useParams } from 'react-router-dom'
import { trpc } from '@/lib/trpc'
import { DocumentViewer } from '@/components/document/DocumentViewer'
import { DocumentForm } from '@/components/document/DocumentForm'
import { Card, CardContent } from '@/components/ui/card'
import ReactMarkdown from 'react-markdown'

export function DocumentPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <div>Error: No document ID provided.</div>;
  }

  const getDocumentQuery = trpc.documents.getById.useQuery({ id });

  if (getDocumentQuery.isLoading) {
    return <div>Loading document...</div>;
  }

  if (getDocumentQuery.isError) {
    return <div>Error: {getDocumentQuery.error.message}</div>;
  }

  const document = getDocumentQuery.data;
  const template = document.template;
    if (document.content && !template) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">{document.name}</h1>
        <Card>
          <CardContent className="prose dark:prose-invert max-w-none p-6">
            {/* Use a Markdown renderer to display the AI-generated content */}
            <ReactMarkdown>{document.content}</ReactMarkdown>
          </CardContent>
        </Card>
        {/* We can add signing/minting UI for AI docs here later */}
      </div>
    )
  }


  if (!template) {
    return <div>Error: This document is not linked to a valid template and has no generated content.</div>
  }

  return (
    <div className="grid md:grid-cols-2 gap-8 h-full">
      <div className="h-[80vh]">
        <DocumentViewer storagePath={template.storage_path} />
      </div>
      <div>
        <h1 className="text-3xl font-bold mb-2">{document.name}</h1>
        <p className="text-muted-foreground mb-6">
          Review the document and fill in the required fields.
        </p>
        <DocumentForm document={document} template={template} />
      </div>
    </div>
  );
}
