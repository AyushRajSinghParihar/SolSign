import type { RouterOutputs } from '@repo/api'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Badge } from '@/components/ui/badge'

type Party = RouterOutputs['documents']['getById']['parties'][0]

export function PartyList({ parties }: { parties: Party[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>Signing Parties</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Wallet</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parties.map((party) => (
              <TableRow key={party.wallet}>
                <TableCell>{party.email}</TableCell>
                <TableCell className="font-mono text-xs">{`${party.wallet.slice(0, 6)}...${party.wallet.slice(-4)}`}</TableCell>
                <TableCell>
                  <Badge variant={party.status === 'signed' ? 'default' : 'secondary'} className={party.status === 'signed' ? 'bg-green-600' : ''}>
                    {party.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}