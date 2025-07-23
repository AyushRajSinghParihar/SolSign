import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useEffect, useState } from 'react'
import { trpc } from '../lib/trpc'
import { useAuth } from '../hooks/useAuth'
import bs58 from 'bs58'
import { Button } from './ui/button'

export const AuthButton = () => {
  const { connected, publicKey, signMessage, disconnect } = useWallet()
  const { token, setToken, logout: authLogout } = useAuth()
  const [isSigning, setIsSigning] = useState(false)

  const getNonce = trpc.auth.getNonce.useMutation()
  const verifySignature = trpc.auth.verify.useMutation()

  const handleSign = async () => {
    if (!publicKey || !signMessage) return

    setIsSigning(true)
    try {
      // 1. Get nonce from backend
      const { nonce } = await getNonce.mutateAsync({
        walletAddress: publicKey.toBase58(),
      })

      // 2. Prompt user to sign the nonce
      const signature = await signMessage(new TextEncoder().encode(nonce))

      // 3. Verify signature and get JWT from backend
      const { token } = await verifySignature.mutateAsync({
        publicKey: publicKey.toBase58(),
        signature: bs58.encode(signature),
        nonce,
      })
      
      // 4. Set the token in our global auth store
      setToken(token)
    } catch (error) {
      console.error('Sign-in failed', error)
      // Optionally show an error toast to the user
    } finally {
      setIsSigning(false)
    }
  }

  const handleLogout = () => {
    authLogout();
    disconnect();
  }

  useEffect(() => {
    // Automatically trigger sign-in when wallet connects, if not already authenticated
    if (connected && !token && !isSigning && !verifySignature.isSuccess) {
      handleSign()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, token])

  // Case 1: Wallet is not connected
  if (!connected) {
    return <WalletMultiButton />
  }

  // Case 2: Wallet is connected, and we have a valid JWT
  if (token) {
    return (
      <div className="flex items-center gap-4">
        <p className="text-sm text-muted-foreground">
          Welcome,{' '}
          <span className="font-mono text-foreground">
            {`${publicKey?.toBase58().slice(0, 4)}...${publicKey?.toBase58().slice(-4)}`}
          </span>
        </p>
        <Button variant="outline" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    )
  }

  // Case 3: Wallet is connected, but we are waiting for signature/verification
  return (
    <Button onClick={handleSign} disabled={isSigning}>
      {isSigning ? 'Verifying in wallet...' : 'Verify Wallet to Sign In'}
    </Button>
  )
}
