import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";

export const AuthInitializer = ({ children }: { children: React.ReactNode }) => {
  const { restoreSession } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await restoreSession();
      } catch (error) {
        console.error("Failed to restore session:", error);
      } finally {
        setIsInitialized(true);
      }
    };

    initAuth();
  }, [restoreSession]);

  // Show nothing while initializing to prevent flash of wrong content
  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
};

