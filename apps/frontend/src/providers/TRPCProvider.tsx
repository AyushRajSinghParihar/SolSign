import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import React, { useMemo, useState } from 'react' // <-- Import useMemo
import { trpc } from '../lib/trpc'
import { useAuth } from '../hooks/useAuth'

export const TRPCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // This hook ensures that this component re-renders whenever the token changes.
  const { token } = useAuth()

  // We only need one instance of the QueryClient.
  const [queryClient] = useState(() => new QueryClient())

  // We use useMemo to re-create the trpcClient *only* when the `token` changes.
  // This is the key to solving the stale closure problem.
  const trpcClient = useMemo(() => {
    console.log(`🚀 Creating new tRPC client. Token is: ${token ? 'present' : 'null'}`)
    return trpc.createClient({
      links: [
        httpBatchLink({
          url: import.meta.env.VITE_API_URL,
          // Now, when this client is created, the `headers` function
          // will have a closure over the CURRENT value of `token`.
          headers() {
            return {
              authorization: token ? `Bearer ${token}` : '',
            }
          },
        }),
      ],
    })
  }, [token]) // <-- The dependency array is crucial. This code runs when `token` changes.

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  )
}
