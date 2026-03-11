import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from '../services/authServices';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LogOut, User as UserIcon, Mail, UserCircle } from 'lucide-react';

export default function Home() {
  const { user } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  const displayUser = user;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      toast.success('Sesión cerrada con éxito');
      setTimeout(() => {
        navigate('/auth/login', { replace: true });
      }, 100);
    } catch {
      toast.error('Error al cerrar sesión');
      setTimeout(() => {
        navigate('/auth/login', { replace: true });
      }, 100);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Bienvenido a Casa
              </h1>
            </div>
            <p className="text-muted-foreground">
              Gestiona tu cuenta y explora la plataforma
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="gap-2 shrink-0"
          >
            {isLoggingOut ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Cerrando sesión...
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </>
            )}
          </Button>
        </div>

        {displayUser && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Información del Usuario</CardTitle>
                  <CardDescription>Detalles de tu cuenta</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Correo Electrónico</p>
                  <p className="text-sm text-muted-foreground">{displayUser.email}</p>
                </div>
              </div>
              {displayUser.name && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <UserIcon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Nombre</p>
                    <p className="text-sm text-muted-foreground">{displayUser.name}</p>
                  </div>
                </div>
              )}
              {displayUser.role && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <UserCircle className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Rol</p>
                    <p className="text-sm text-muted-foreground">{displayUser.role}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
