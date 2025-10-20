import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { Skeleton } from "../ui/skeleton";
import { EmptyState } from "../ui/empty-state";
import { FileText } from "lucide-react";

export function DocumentList() {
  const navigate = useNavigate();
  const getDocumentsQuery = trpc.documents.getAll.useQuery();

  if (getDocumentsQuery.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const documents = getDocumentsQuery.data || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Documents</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.length > 0 ? (
              documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <Link
                      to={`/documents/${doc.id}`}
                      className="font-medium text-primary hover:underline break-words block"
                    >
                      {doc.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        doc.status === "signed" ? "default" : "secondary"
                      }
                    >
                      {doc.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(doc.updated_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3}>
                  <EmptyState
                    icon={FileText}
                    title="No Documents Yet"
                    description="Start by generating a contract with AI or uploading a template document."
                    action={{
                      label: "Generate Document",
                      onClick: () => navigate('/documents/generate')
                    }}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
