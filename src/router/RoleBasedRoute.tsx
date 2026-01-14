import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
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
  const [profileWaitTimeout, setProfileWaitTimeout] = useState(false);

  // useEffect(() => {
  //   if (isProfileLoading && !profile) {
  //     const timer = setTimeout(() => {
  //       setProfileWaitTimeout(true);
  //     }, 3000);
  //     return () => clearTimeout(timer);
  //   } else {
  //     setProfileWaitTimeout(false);
  //   }
  // }, [isProfileLoading, profile]);

  if (isLoading) {
    return <Loading message="Checking authentication..." fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  if (isProfileLoading && !profile) {
    return <Loading message="Loading profile..." fullScreen />;
  }

  if (!user || !hasAnyRole(user, allowedRoles)) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return <>{children}</>;
};
