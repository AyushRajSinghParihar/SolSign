import { TemplateList } from "@/components/template/TemplateList";

export function HomePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          View and manage your AI-generated document templates.
        </p>
      </div>
      <TemplateList />
    </div>
  );
}
