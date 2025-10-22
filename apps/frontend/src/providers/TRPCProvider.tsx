import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import React, { useMemo, useState } from "react"; // <-- Import useMemo
import { trpc } from "../lib/trpc";
import { useAuth } from "../hooks/useAuth";

export const TRPCProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // This hook ensures that this component re-renders whenever the token changes.
  const { token } = useAuth();

  // We only need one instance of the QueryClient.
  const [queryClient] = useState(() => new QueryClient());

  // We use useMemo to re-create the trpcClient *only* when the `token` changes.
  // This is the key to solving the stale closure problem.
  const trpcClient = useMemo(() => {
    const apiUrl = import.meta.env.VITE_API_URL;
    
    console.log(`🚀 Creating new tRPC client with config:`, {
      apiUrl,
      hasToken: !!token,
      origin: window.location.origin,
    });

    if (!apiUrl) {
      console.error('❌ VITE_API_URL is not configured!');
      console.error('Please set VITE_API_URL environment variable');
    }

    return trpc.createClient({
      links: [
        httpBatchLink({
          url: apiUrl,
          // Now, when this client is created, the `headers` function
          // will have a closure over the CURRENT value of `token`.
          headers() {
            return {
              authorization: token ? `Bearer ${token}` : "",
            };
          },
          fetch(url, options) {
            console.log(`📡 tRPC request to: ${url}`);
            return fetch(url, options)
              .then(res => {
                if (!res.ok) {
                  console.error(`❌ tRPC response error:`, {
                    status: res.status,
                    statusText: res.statusText,
                    url,
                  });
                }
                return res;
              })
              .catch(err => {
                console.error(`❌ tRPC fetch error:`, {
                  message: err.message,
                  name: err.name,
                  url,
                });
                
                // Provide user-friendly error messages
                if (err.message === 'Failed to fetch') {
                  console.error('💡 Possible causes:');
                  console.error('  1. CORS misconfiguration');
                  console.error('  2. Backend is not running');
                  console.error('  3. Network connectivity issue');
                  console.error(`  4. Backend URL incorrect: ${apiUrl}`);
                }
                
                throw err;
              });
          },
        }),
      ],
    });
  }, [token]); // <-- The dependency array is crucial. This code runs when `token` changes.

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
};
