import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { ReactElement } from "react";

export const ProtectedRoute = ({ children }: { children: ReactElement }) => {
  const { token } = useAuth();
  const location = useLocation();

  if (!token) {
    // User not authenticated, redirect to login page.
    // Crucially, we pass the current location in the `state` object.
    // This "remembers" where the user was trying to go.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};