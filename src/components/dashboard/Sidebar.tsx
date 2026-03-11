import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/services/authServices";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  Menu,
  X,
} from "lucide-react";
import iNotusLogo from "@/assets/iNotus-color.svg";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { Role } from "@/types/auth.types";
import { navItems } from "@/constants/navigation";

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, subscription } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const filteredNavItems = useMemo(() => {
    if (!user) return [];

    const isSubscriptionActive = subscription && (subscription.status === 'active' || subscription.status === 'trialing');

    return navItems.filter(item => {
      const hasRoleAccess = item.roles.includes(user.role as Role);
      if (!hasRoleAccess) return false;

      if (item.requiresActiveSubscription && !isSubscriptionActive) {
        return false;
      }

      return true;
    });
  }, [user, subscription]);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      toast.success("Sesión cerrada con éxito");
      setTimeout(() => {
        navigate("/auth/login", { replace: true });
      }, 100);
    } catch {
      toast.error("Error al cerrar sesión");
      setTimeout(() => {
        navigate("/auth/login", { replace: true });
      }, 100);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="bg-white shadow-md hover:bg-gray-50 border border-gray-200 h-11 w-11 rounded-lg transition-all duration-200"
          aria-label={isMobileOpen ? "Cerrar menú" : "Abrir menú"}
        >
          <Menu className="h-5 w-5 text-gray-700" strokeWidth={2} />
        </Button>
      </div>

      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 h-full bg-white border-r border-gray-200 z-50 transition-transform duration-300 ease-in-out shadow-xl lg:shadow-none",
          "lg:translate-x-0 lg:static lg:z-auto",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full w-64">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-brand-primary-50 to-brand-secondary-50 relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileOpen(false)}
               className="lg:hidden absolute top-4 right-4 h-8 w-8 text-gray-600 hover:text-gray-900 hover:bg-white/50"
               aria-label="Cerrar menú"
             >
              <X className="h-5 w-5" strokeWidth={2.5} />
            </Button>
            <Link
              to="/"
              onClick={() => setIsMobileOpen(false)}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <img
                src={iNotusLogo}
                alt="iNotus Logo"
                className="w-10 h-10 rounded-lg object-contain"
              />
              <div>
                 <h1 className="text-xl font-semibold text-gray-900">
                   iNotus
                 </h1>
                 <p className="text-xs text-gray-500">Informes de Ventas</p>
               </div>
            </Link>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  title={item.description}
                  className={cn(
                    "group flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-r from-brand-primary-600 to-brand-primary-700 text-white shadow-md"
                      : "text-gray-700 hover:bg-brand-primary-50 hover:text-brand-primary-700 hover:shadow-sm"
                  )}
                >
                  <Icon className={cn(
                    "h-5 w-5 flex-shrink-0 transition-transform",
                    isActive ? "text-white" : "text-gray-500 group-hover:text-brand-primary-600",
                    !isActive && "group-hover:scale-110"
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{item.label}</div>
                  </div>
                </Link>
              );
            })}
          </nav>
          {/* 
          <div className="p-4 border-t border-gray-200">
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 text-sm mb-2">
                WhatsApp Integration
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Salespeople send voice messages via WhatsApp. Reports appear
                here automatically.
              </p>
            </div>
          </div> */}

          <div className="p-4 border-t border-gray-200">
            {user && (
              <div className="mb-3 px-2">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.name || user.email}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            )}
            <Button
              variant="ghost"
               onClick={handleLogout}
               disabled={isLoggingOut}
               className="w-full justify-start gap-3 text-gray-700 hover:bg-red-50 hover:text-red-600"
             >
               <LogOut className="h-4 w-4" />
               {isLoggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
             </Button>
          </div>
        </div>
      </aside>
    </>
  );
};
