import { trpc } from '@/lib/trpc'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'

export function TemplateList() {
  const getTemplatesQuery = trpc.templates.getTemplates.useQuery(undefined, {
    // Refetch every 10 seconds to catch new templates from the async backend
    refetchInterval: 10000,
  })

  if (getTemplatesQuery.isLoading) {
    return <div>Loading templates...</div>
  }

  if (getTemplatesQuery.isError) {
    return <div>Error: {getTemplatesQuery.error.message}</div>
  }

  const templates = getTemplatesQuery.data

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Document Templates</CardTitle>
        <Button size="sm" onClick={() => getTemplatesQuery.refetch()}>Refresh</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Created</TableHead>
              <TableHead>Extracted Fields</TableHead>
              <TableHead>Extracted Clauses</TableHead>
              <TableHead>Owner</TableHead>
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
                    {template.owner?.wallet_address.slice(0, 6)}...
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No templates found. Upload a document to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}