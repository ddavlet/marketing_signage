import { Navigate, Outlet } from "react-router-dom";
import type { Role } from "./lib/auth-store";
import { useAuthStore } from "./lib/auth-store";

export function ProtectedRoute() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

interface RoleRouteProps {
  allow: Role[];
}

export function RoleRoute({ allow }: RoleRouteProps) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
