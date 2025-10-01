import { Navigate, useLocation } from "react-router-dom";
import { AuthButton } from "../components/AuthButton";
import { useAuth } from "../hooks/useAuth";

export function LoginPage() {
  const { token } = useAuth();
  const location = useLocation();
  
  // Recall the location the user was trying to access.
  // The `(location.state as any)` is a standard way to handle this.
  // Default to the homepage if no previous location was stored.
  const from = (location.state as any)?.from?.pathname || "/";

  // If a user who is already logged in navigates to this page,
  // immediately send them to their intended destination.
  if (token) {
    return <Navigate to={from} replace />;
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background text-foreground">
      <div className="container mx-auto flex flex-col items-center justify-center gap-4 p-4">
        <h1 className="text-4xl font-bold">Welcome to SolSignAI</h1>
        <p className="text-muted-foreground">
          Please connect and verify your wallet to continue.
        </p>
        <div className="mt-4">
          <AuthButton />
        </div>
      </div>
    </div>
  );
}