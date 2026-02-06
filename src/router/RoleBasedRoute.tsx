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
  const { isAuthenticated, user, profile, isLoading, isProfileLoading } =
    useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Loading message="Checking authentication..." fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  if (isProfileLoading && !profile) {
    return <Loading message="Loading profile..." fullScreen />;
  }

  const checkProfileRole = (): boolean => {
    if (!profile) return false;
    const profileRole = profile.role?.toLowerCase();
    const isManagerRole = profileRole === 'manager' && allowedRoles.includes(Role.MANAGER);
    const isSalesRepRole = (profileRole === 'sales_representative' || profileRole === 'salesrepresentative') 
      && allowedRoles.includes(Role.SALES_REPRESENTATIVE);
    return isManagerRole || isSalesRepRole;
  };

    if (profile && checkProfileRole()) {
    if (!user || !user.role) {
      return <>{children}</>;
    }
    }
  
  if (!user || !hasAnyRole(user, allowedRoles)) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return <>{children}</>;
};
