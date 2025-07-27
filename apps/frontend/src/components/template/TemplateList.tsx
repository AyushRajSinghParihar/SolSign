import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TemplateListSkeleton } from './TemplateListSkeleton'

/**
 * A dialog component for creating a new document from a template.
 * It prompts the user for a name and handles the creation logic.
 */
function CreateDocumentDialog({
  templateId,
  isOpen,
  onOpenChange,
}: {
  templateId: string
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
}) {
  const [name, setName] = useState('')
  const navigate = useNavigate()
  const createDocumentMutation = trpc.documents.create.useMutation()

  const handleSubmit = async () => {
    const promise = createDocumentMutation.mutateAsync({ templateId, name })

    toast.promise(promise, {
      loading: 'Creating document...',
      success: (newDocument) => {
        onOpenChange(false)
        navigate(`/documents/${newDocument.id}`)
        return 'Document created successfully!'
      },
      error: (err) => `Failed to create document: ${err.message}`,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Name Your Document</DialogTitle>
          <DialogDescription>
            Give this new document a name to easily identify it later.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="e.g., NDA with Acme Corp"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || createDocumentMutation.isPending}
          >
            {createDocumentMutation.isPending ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Displays a list of all available document templates and allows users
 * to create new document instances from them.
 */
export function TemplateList() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  const getTemplatesQuery = trpc.templates.getTemplates.useQuery(undefined, {
    refetchInterval: 10000,
    onError: (error) => {
      toast.error('Failed to fetch templates', {
        description: error.message,
      })
    },
  })

  const handleUseTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId)
    setDialogOpen(true)
  }

  const templates = getTemplatesQuery.data || []

  return (
    <>
      {selectedTemplateId && (
        <CreateDocumentDialog
          templateId={selectedTemplateId}
          isOpen={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle>Document Templates</CardTitle>
            <p className="text-sm text-muted-foreground">
              Start a new document by choosing a template below.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => getTemplatesQuery.refetch()}
            disabled={getTemplatesQuery.isFetching}
          >
            {getTemplatesQuery.isFetching ? 'Refreshing...' : 'Refresh'}
          </Button>
        </CardHeader>
        <CardContent>
          {getTemplatesQuery.isLoading ? (
            <TemplateListSkeleton />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>Fields</TableHead>
                  <TableHead>Clauses</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.length > 0 ? (
                  templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        {new Date(template.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {template.extracted_data_json.fields?.length || 0}
                      </TableCell>
                      <TableCell>
                        {template.extracted_data_json.clauses?.length || 0}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {template.owner?.wallet_address
                          ? `${template.owner.wallet_address.slice(0, 6)}...`
                          : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleUseTemplate(template.id)}
                        >
                          Use Template
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No templates found. Upload a document to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  )
}