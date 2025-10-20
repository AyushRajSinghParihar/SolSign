import type { AppRouter } from "@repo/api";
import type { inferRouterOutputs } from "@trpc/server";
import { useEffect, useState } from "react";
import { decryptData } from "@/lib/crypto";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { EmptyState } from "../ui/empty-state";
import { Database } from "lucide-react";

type RouterOutput = inferRouterOutputs<AppRouter>;
type VaultItem = RouterOutput["vault"]["getItems"][0];
type DecryptedItem = { fullName: string; homeAddress: string };

type VaultListProps = {
  query: ReturnType<typeof trpc.vault.getItems.useQuery>;
  getKey: () => Promise<CryptoKey>;
};

const VaultItemCard = ({
  item,
  getKey,
}: {
  item: VaultItem;
  getKey: () => Promise<CryptoKey>;
}) => {
  const [decrypted, setDecrypted] = useState<DecryptedItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const utils = trpc.useUtils();
  const deleteMutation = trpc.vault.deleteItem.useMutation({
    onSuccess: () => {
      // Invalidate the query to refetch the list
      utils.vault.getItems.invalidate();
    },
  });

  useEffect(() => {
    const decrypt = async () => {
      try {
        const key = await getKey();
        const data = await decryptData<DecryptedItem>(key, item.ciphertext);
        setDecrypted(data);
      } catch (e) {
        console.error("Decryption failed:", e);
        // Handle decryption error, e.g., show an error state
      }
    };
    decrypt();
  }, [item.ciphertext, getKey]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync({ id: item.id });
    } catch (error) {
      console.error("Failed to delete item", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Item: {item.id.slice(0, 8)}</CardTitle>
            <CardDescription>Type: {item.type}</CardDescription>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {decrypted ? (
          <div className="space-y-2 font-mono text-sm">
            <p>
              <span className="font-semibold">Full Name:</span>{" "}
              {decrypted.fullName}
            </p>
            <p>
              <span className="font-semibold">Address:</span>{" "}
              {decrypted.homeAddress}
            </p>
          </div>
        ) : (
          <p>Decrypting...</p>
        )}
      </CardContent>
    </Card>
  );
};

export function VaultList({ query, getKey }: VaultListProps) {
  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Your Vault Items</h2>
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }
  
  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Your Vault Items</h2>
      {query.data && Array.isArray(query.data) && query.data.length > 0 ? (
        query.data.map((item) => (
          <VaultItemCard key={item.id} item={item} getKey={getKey} />
        ))
      ) : (
        <EmptyState
          icon={Database}
          title="Your Vault is Empty"
          description="Add your personal or business information to auto-fill documents quickly and securely."
        />
      )}
    </div>
  );
}
