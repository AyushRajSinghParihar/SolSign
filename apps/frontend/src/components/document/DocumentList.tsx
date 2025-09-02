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
import { Link } from "react-router-dom";

export function DocumentList() {
  const getDocumentsQuery = trpc.documents.getAll.useQuery();

  if (getDocumentsQuery.isLoading) {
    // You can create a skeleton for this too!
    return <div>Loading your documents...</div>;
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
                      className="font-medium text-primary hover:underline"
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
                <TableCell colSpan={3} className="h-24 text-center">
                  You haven't created any documents yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
