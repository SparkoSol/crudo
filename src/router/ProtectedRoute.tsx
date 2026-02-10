import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Loading } from "../components/Loading";
import { ROUTES } from "./routes";
import { Role } from "@/types/auth.types";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, isProfileLoading, subscription, user } = useAuth();
  const location = useLocation();

  if (isLoading || isProfileLoading) {
    return <Loading message="Checking authentication..." fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  if (location.pathname === ROUTES.SUBSCRIPTION && user?.role === Role.SALES_REPRESENTATIVE) {
    return <Navigate to={ROUTES.ACCESS_DENIED} replace />;
  }

  if (location.pathname === ROUTES.ACCESS_DENIED) {
    return <>{children}</>;
  }

  const isSubscriptionActive = subscription && (subscription.status === 'active' || subscription.status === 'trialing');

  if (!isSubscriptionActive) {
    if (user?.role === Role.SALES_REPRESENTATIVE) {
      return <Navigate to={ROUTES.ACCESS_DENIED} replace />;
    }

    if (location.pathname !== ROUTES.SUBSCRIPTION) {
      return <Navigate to={ROUTES.SUBSCRIPTION} replace />;
    }
  }

  return <>{children}</>;
};
