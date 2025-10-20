import { trpc } from '@/lib/trpc'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Link, useNavigate } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { MessageSquare } from 'lucide-react'

export function NegotiationsListPage() {
  const navigate = useNavigate()
  const getNegotiationsQuery = trpc.agent.getAllNegotiations.useQuery()

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">AI Negotiations</h1>
        <p className="text-muted-foreground">
          Monitor and manage all your active and completed contract negotiations.
        </p>
      </div>
      <Card>
        <CardHeader><CardTitle>Your Negotiations</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Counterparty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getNegotiationsQuery.isLoading && (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  </TableRow>
                ))
              )}
              {getNegotiationsQuery.data && getNegotiationsQuery.data.length > 0 ? (
                getNegotiationsQuery.data.map((neg) => (
                  <TableRow key={neg.id}>
                    <TableCell>
                      <Link to={`/negotiations/${neg.id}`} className="font-medium text-primary hover:underline">
                        {Array.isArray(neg.document) && neg.document[0]?.name || 'Unknown Document'}
                      </Link>
                    </TableCell>
                    <TableCell>{neg.counterparty_email}</TableCell>
                    <TableCell><Badge>{neg.status}</Badge></TableCell>
                    <TableCell>{new Date(neg.updated_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                !getNegotiationsQuery.isLoading && (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <EmptyState
                        icon={MessageSquare}
                        title="No Active Negotiations"
                        description="Deploy an AI agent to negotiate contracts on your behalf. Set your terms and let AI handle the back-and-forth."
                        action={{
                          label: "Go to Documents",
                          onClick: () => navigate('/')
                        }}
                      />
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}