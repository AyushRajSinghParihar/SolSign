import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { token } = useAuth();

  if (!token) {
    // User not authenticated, redirect to login page
    return <Navigate to="/login" />;
  }

  return children;
};
