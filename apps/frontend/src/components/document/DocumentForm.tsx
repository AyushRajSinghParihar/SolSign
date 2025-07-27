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
import { Button } from "../ui/button";
import { toast } from "sonner";
import sha256 from "tiny-sha256";

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
    document.filled_data_json || {},
  );
  const [conflicts, setConflicts] = useState<Conflict[]>([]);

  const getVaultItemsQuery = trpc.vault.getItems.useQuery();
  const autofillMutation = trpc.documents.autofill.useMutation();
  const conflictCheckMutation = trpc.documents.checkForConflicts.useMutation();
  const saveMutation = trpc.documents.save.useMutation();
  const signMutation = trpc.documents.sign.useMutation();

  const debouncedFormState = useDebounce(formState, 500);
  const isSigned = document.status === "signed";

  // Effect to trigger autofill once vault data is loaded (only if document is a draft)
  useEffect(() => {
    if (getVaultItemsQuery.data && signMessage && !document.filled_data_json) {
      const runAutofill = async () => {
        const key = await getKey(signMessage);
        const decryptedVaultItems = await Promise.all(
          getVaultItemsQuery.data.map((item) =>
            decryptData(key, item.ciphertext),
          ),
        );
        const vaultData = decryptedVaultItems.reduce(
          (acc, item) => ({ ...acc, ...item }),
          {},
        );

        const autofilledData = await autofillMutation.mutateAsync({
          templateFields: template.extracted_data_json.fields,
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
  }, [debouncedFormState, isSigned]);

  const handleInputChange = (fieldLabel: string, value: string) => {
    setFormState((prevState) => ({ ...prevState, [fieldLabel]: value }));
  };

  const handleSaveDraft = async () => {
    toast.promise(
      saveMutation.mutateAsync({
        documentId: document.id,
        filledData: formState,
      }),
      {
        loading: "Saving draft...",
        success: "Draft saved successfully!",
        error: (err) => `Failed to save: ${err.message}`,
      },
    );
  };

  const handleSignDocument = async () => {
    if (!signMessage) {
      toast.error("Wallet not connected or does not support signing.");
      return;
    }

    // 1. Save the latest data first
    await saveMutation.mutateAsync({
      documentId: document.id,
      filledData: formState,
    });

    // 2. Create a stable JSON string and hash it
    const documentJson = JSON.stringify(
      formState,
      Object.keys(formState).sort(),
    );
    const documentHash = sha256(new TextEncoder().encode(documentJson));

    // 3. Prompt the user to sign the hash
    const messageToSign = `I am signing document "${document.name}" with the content hash: ${documentHash}`;
    await signMessage(new TextEncoder().encode(messageToSign));

    // 4. Send the hash to the backend to finalize the signature
    const promise = signMutation.mutateAsync({
      documentId: document.id,
      documentHash,
    });
    toast.promise(promise, {
      loading: "Recording signature...",
      success: (updatedDocument) => {
        setDocument(updatedDocument); // Update the local state to "signed"
        return "Document signed successfully!";
      },
      error: (err) => `Failed to sign: ${err.message}`,
    });
  };

  const fields = template.extracted_data_json.fields || [];

  return (
    <div className="space-y-6">
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

      {!isSigned && (
        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? "Saving..." : "Save Draft"}
          </Button>
          <Button
            onClick={handleSignDocument}
            disabled={signMutation.isPending}
          >
            {signMutation.isPending ? "Signing..." : "Sign Document"}
          </Button>
        </div>
      )}
    </div>
  );
}
