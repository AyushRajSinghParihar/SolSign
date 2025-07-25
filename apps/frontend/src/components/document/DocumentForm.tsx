import { useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useEncryptionKey, decryptData } from '@/lib/crypto'
import { trpc } from '@/lib/trpc'
// --- THIS IS THE FIX ---
import type { RouterOutputs } from '@repo/api'
// --- END OF FIX ---
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { AlertCircle } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'

// Use the new, clean type from our shared package
type DocumentWithTemplate = RouterOutputs['documents']['getById']
type Template = DocumentWithTemplate['template']

type DocumentFormProps = {
  document: DocumentWithTemplate
  template: Template
}

type FormState = Record<string, string>
type Conflict = { field: string; issue: string }

export function DocumentForm({ template }: DocumentFormProps) {
  const { signMessage } = useWallet()
  const { getKey } = useEncryptionKey()
  const [formState, setFormState] = useState<FormState>({})
  const [conflicts, setConflicts] = useState<Conflict[]>([])

  const getVaultItemsQuery = trpc.vault.getItems.useQuery()
  const autofillMutation = trpc.documents.autofill.useMutation()
  const conflictCheckMutation = trpc.documents.checkForConflicts.useMutation()

  // Debounce the form state to avoid excessive conflict checks
  const debouncedFormState = useDebounce(formState, 500)

  // Effect to trigger autofill once vault data is loaded
  useEffect(() => {
    if (getVaultItemsQuery.data && signMessage) {
      const runAutofill = async () => {
        const key = await getKey(signMessage)
        const decryptedVaultItems = await Promise.all(
          getVaultItemsQuery.data.map(item => decryptData(key, item.ciphertext))
        )
        // Combine all vault items into a single object
        const vaultData = decryptedVaultItems.reduce((acc, item) => ({ ...acc, ...item }), {})

        const autofilledData = await autofillMutation.mutateAsync({
          templateFields: template.extracted_data_json.fields,
          vaultData,
        })
        setFormState(autofilledData)
      }
      runAutofill()
    }
  }, [getVaultItemsQuery.data, signMessage, template.id])

  // Effect to trigger conflict check when debounced form state changes
  useEffect(() => {
    if (Object.keys(debouncedFormState).length > 0) {
      const runConflictCheck = async () => {
        const foundConflicts = await conflictCheckMutation.mutateAsync({
          filledFields: debouncedFormState,
        })
        setConflicts(foundConflicts)
      }
      runConflictCheck()
    }
  }, [debouncedFormState])

  const handleInputChange = (fieldLabel: string, value: string) => {
    setFormState(prevState => ({ ...prevState, [fieldLabel]: value }))
  }

  const fields = template.extracted_data_json.fields || []

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Document Fields</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {autofillMutation.isPending && <p>Autofilling data from your vault...</p>}
          {fields.map((field: { label: string }) => (
            <div key={field.label}>
              <Label htmlFor={field.label}>{field.label}</Label>
              <Input
                id={field.label}
                value={formState[field.label] || ''}
                onChange={(e) => handleInputChange(field.label, e.target.value)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {conflicts.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Potential Conflicts Detected!</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-5 mt-2">
              {conflicts.map((conflict, index) => (
                <li key={index}>
                  <strong>{conflict.field}:</strong> {conflict.issue}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}