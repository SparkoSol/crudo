import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Loading } from "../components/Loading";
import { ROUTES } from "./routes";
import { Role } from "../types/auth.types";
import { hasAnyRole } from "../lib/utils/authorization";

interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles: Role[];
}

export const RoleBasedRoute = ({
  children,
  allowedRoles,
}: RoleBasedRouteProps) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Loading message="Checking authentication..." fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  if (!user || !hasAnyRole(user, allowedRoles)) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return <>{children}</>;
};
