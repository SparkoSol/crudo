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
  const searchParams = new URLSearchParams(location.search);
  const isForcedLogin = location.pathname === ROUTES.LOGIN && searchParams.get("from") === "reset";

  if (isAuthenticated && !isResetPasswordRoute && !isForcedLogin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
