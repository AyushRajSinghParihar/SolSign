import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEncryptionKey, decryptData } from "@/lib/crypto";
import { trpc } from "@/lib/trpc";
import type { RouterOutputs } from "@repo/api";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { DocumentActions } from './DocumentActions';

type DocumentWithTemplate = RouterOutputs["documents"]["getById"];
type Template = DocumentWithTemplate["template"];

type DocumentFormProps = {
  document: DocumentWithTemplate;
  template: Template;
};

type FormState = Record<string, string>;
type Conflict = { field: string; issue: string };

export function DocumentForm({
  document: initialDocument,
  template,
}: DocumentFormProps) {
  const { signMessage } = useWallet();
  const { getKey } = useEncryptionKey();
  // Use local state to manage the document, allowing us to update its status after signing
  const [document, setDocument] = useState(initialDocument);
  const [formState, setFormState] = useState<FormState>(
    document.filled_data_json || {}
  );
  const [conflicts, setConflicts] = useState<Conflict[]>([]);

  const getVaultItemsQuery = trpc.vault.getItems.useQuery();
  const autofillMutation = trpc.documents.autofill.useMutation();
  const conflictCheckMutation = trpc.documents.checkForConflicts.useMutation();

  const debouncedFormState = useDebounce(formState, 500);
  const isSigned = document.status === "signed";

  // Effect to trigger autofill once vault data is loaded (only if document is a draft)
  useEffect(() => {
    if (getVaultItemsQuery.data && signMessage && !document.filled_data_json) {
      const runAutofill = async () => {
        const key = await getKey(signMessage);
        const decryptedVaultItems = await Promise.all(
          getVaultItemsQuery.data.map((item) =>
            decryptData(key, item.ciphertext)
          )
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const vaultData = decryptedVaultItems.reduce<Record<string, any>>(
          (acc, item) => {
            if (item && typeof item === 'object') {
              return { ...acc, ...item };
            }
            return acc;
          },
          {}
        );

        const autofilledData = await autofillMutation.mutateAsync({
          templateFields: template.extracted_data_json?.fields || [],
          vaultData,
        });
        setFormState(autofilledData);
      };
      runAutofill();
    }
  }, [
    getVaultItemsQuery.data,
    signMessage,
    template.id,
    document.filled_data_json,
    autofillMutation,
    getKey,
    template.extracted_data_json?.fields,
  ]);

  // Effect to trigger conflict check when debounced form state changes
  useEffect(() => {
    if (Object.keys(debouncedFormState).length > 0 && !isSigned) {
      const runConflictCheck = async () => {
        const foundConflicts = await conflictCheckMutation.mutateAsync({
          filledFields: debouncedFormState,
        });
        setConflicts(foundConflicts);
      };
      runConflictCheck();
    }
  }, [debouncedFormState, isSigned, conflictCheckMutation]);

  const handleInputChange = (fieldLabel: string, value: string) => {
    setFormState((prevState) => ({ ...prevState, [fieldLabel]: value }));
  };





  const fields = template.extracted_data_json?.fields || [];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow space-y-6 overflow-y-auto p-1">
        {isSigned && (
          <Alert
            variant="default"
            className="bg-green-50 border-green-200 text-green-800"
          >
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Document Signed</AlertTitle>
            <AlertDescription>
              This document has been signed and is now read-only.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Document Fields</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {autofillMutation.isPending && (
              <p>Autofilling data from your vault...</p>
            )}
            {fields.map((field: { label: string }) => (
              <div key={field.label}>
                <Label htmlFor={field.label}>{field.label}</Label>
                <Input
                  id={field.label}
                  value={formState[field.label] || ""}
                  onChange={(e) => handleInputChange(field.label, e.target.value)}
                  disabled={isSigned || autofillMutation.isPending} // Disable if signed
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {conflicts.length > 0 && !isSigned && (
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
      
      {/* Delegate all actions to the new component. Pass the formState as the content to sign. */}
      <DocumentActions
        document={document}
        contentToSign={formState}
        onStatusChange={setDocument}
      />
    </div>
  );
}
