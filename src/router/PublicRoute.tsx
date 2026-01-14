import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ROUTES } from "./routes";

interface PublicRouteProps {
  children: React.ReactNode;
}

export const PublicRoute = ({ children }: PublicRouteProps) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  const isResetPasswordRoute = location.pathname === ROUTES.RESET_PASSWORD;

  if (isAuthenticated && !isResetPasswordRoute) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
