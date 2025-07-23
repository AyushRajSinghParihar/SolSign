import { useWallet } from '@solana/wallet-adapter-react'
import { useEncryptionKey } from '../lib/crypto'
import { trpc } from '../lib/trpc'
import { VaultForm } from '../components/vault/VaultForm'
import { VaultList } from '../components/vault/VaultList'
import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

export function VaultPage() {
  const { signMessage } = useWallet()
  const { getKey, clearKey } = useEncryptionKey()
  const { logout } = useAuth()
  
  // When the user logs out, we must clear the encryption key from memory
  useEffect(() => {
    return () => {
      clearKey()
    }
  }, [logout, clearKey])

  const getItemsQuery = trpc.vault.getItems.useQuery(undefined, {
    // Only run this query if the user has a wallet connected to sign
    enabled: !!signMessage,
  })

  const handleGetKey = async () => {
    if (!signMessage) {
      throw new Error('Wallet not connected or does not support signMessage')
    }
    return getKey(signMessage)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Data Vault</h1>
        <p className="text-muted-foreground">
          Securely store your personal information. This data is encrypted in your
          browser and never visible to our servers.
        </p>
      </div>

      <VaultForm
        onSuccess={() => getItemsQuery.refetch()}
        getKey={handleGetKey}
      />

      <VaultList
        query={getItemsQuery}
        getKey={handleGetKey}
      />
    </div>
  )
}
