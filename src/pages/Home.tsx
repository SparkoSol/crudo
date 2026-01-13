import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { signOut } from '../services/authServices';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LogOut, User as UserIcon, Mail, Settings, Shield, UserCircle } from 'lucide-react';
import { isManager } from '../lib/utils/authorization';
import { ROUTES } from '../router/routes';

export default function Home() {
  const { user, setUser } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  const displayUser = user;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      setUser(null);
      toast.success('Logged out successfully');
      setTimeout(() => {
        navigate('/auth/login', { replace: true });
      }, 100);
    } catch {
      setUser(null);
      toast.error('Logout failed');
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
                Welcome Home
              </h1>
            </div>
            <p className="text-muted-foreground">
              Manage your account and explore the platform
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
                Logging out...
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4" />
                Logout
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
                  <CardTitle>User Information</CardTitle>
                  <CardDescription>Your account details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{displayUser.email}</p>
                </div>
              </div>
              {displayUser.name && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <UserIcon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Name</p>
                    <p className="text-sm text-muted-foreground">{displayUser.name}</p>
                  </div>
                </div>
              )}
              {displayUser.role && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <UserCircle className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Role</p>
                    <p className="text-sm text-muted-foreground">{displayUser.role}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer group border-2 hover:border-primary/20">
            <Link to="/rtk-test" className="block">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                    <Settings className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      RTK Query Test
                    </CardTitle>
                    <CardDescription>
                      Test RTK Query functionality and features
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Link>
          </Card>
          {isManager(displayUser) && (
            <Card className="hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer group border-2 hover:border-primary/20">
              <Link to={ROUTES.MANAGER_DASHBOARD} className="block">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                      <Shield className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        Manager Dashboard
                      </CardTitle>
                      <CardDescription>
                        Access manager-only features and analytics
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Link>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
