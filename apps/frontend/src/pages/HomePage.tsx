import { DocumentList } from '@/components/document/DocumentList'
import { TemplateList } from '@/components/template/TemplateList'
import { Separator } from '@/components/ui/separator'

export function HomePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your documents and templates.
        </p>
      </div>
      
      <DocumentList />
      
      <Separator className="my-8" />

      <TemplateList />
    </div>
  )
}