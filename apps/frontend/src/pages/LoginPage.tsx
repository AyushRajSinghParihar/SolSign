import { Navigate } from "react-router-dom";
import { AuthButton } from "../components/AuthButton";
import { useAuth } from "../hooks/useAuth";

export function LoginPage() {
  const { token } = useAuth();

  // If user is already logged in, redirect them to the home page
  if (token) {
    return <Navigate to="/" />;
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
