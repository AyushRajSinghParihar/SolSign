import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { ReactElement } from "react";

export const ProtectedRoute = ({ children }: { children: ReactElement }) => {
  const { token } = useAuth();

  if (!token) {
    // User not authenticated, redirect to login page
    return <Navigate to="/login" />;
  }

  return children;
};
