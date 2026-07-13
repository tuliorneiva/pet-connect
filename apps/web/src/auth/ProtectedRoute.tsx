import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <p style={{ padding: "var(--space-8)" }}>Carregando…</p>;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
