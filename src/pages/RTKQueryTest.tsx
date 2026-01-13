import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { signIn, signOut, refreshSession } from '../services/authServices';
import { getAuthToken } from '../lib/utils/auth';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, RefreshCw, LogOut, Key, Info, ArrowLeft } from 'lucide-react';

export default function SupabaseTest() {
  const navigate = useNavigate();
  const { user, isAuthenticated, setUser } = useAuth();
  const token = getAuthToken();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [testPassword, setTestPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);

  const handleTestLogin = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await signIn({ email: testEmail, password: testPassword });
      setUser(result.user);
      toast.success('Test login successful!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestLogout = async () => {
    setIsLoading(true);
    try {
      await signOut();
      setUser(null);
      toast.success('Logged out successfully');
    } catch (err) {
      setUser(null);
      toast.error('Logout failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshToken = async () => {
    setIsRefreshing(true);
    try {
      const session = await refreshSession();
      
      if (session?.user) {
        const userData = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.user_metadata?.full_name || '',
          role: session.user.user_metadata?.role || 'user',
        };
        
        setUser(userData);
        toast.success('Token refreshed successfully!');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Token refresh failed';
      toast.error(errorMessage);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate(-1)}
                className="shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1">
                <CardTitle className="text-3xl">Supabase Auth Test Page</CardTitle>
                <CardDescription>
                  This page demonstrates Supabase authentication features including login, logout, and token refresh.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Authentication Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="font-medium">Authenticated:</span>
              <div className="flex items-center gap-2">
                {isAuthenticated ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">Yes</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-red-600">No</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="font-medium">Token:</span>
              <span className="text-muted-foreground font-mono text-sm">
                {token ? `${token.substring(0, 20)}...` : 'None'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="font-medium">User from Redux:</span>
              <span className="text-muted-foreground">
                {user ? user.email : 'None'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Supabase Auth Examples</CardTitle>
            <CardDescription>Test Supabase authentication methods</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Key className="h-4 w-4" />
                Login with Supabase
              </h3>
              <div className="space-y-2">
                <Input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Email"
                  disabled={isLoading}
                />
                <Input
                  type="password"
                  value={testPassword}
                  onChange={(e) => setTestPassword(e.target.value)}
                  placeholder="Password"
                  disabled={isLoading}
                />
              </div>
              <Button
                onClick={handleTestLogin}
                disabled={isLoading}
                className="w-full gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  'Test Login'
                )}
              </Button>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {error}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                Logout
              </h3>
              <Button
                onClick={handleTestLogout}
                disabled={isLoading || !isAuthenticated}
                variant="destructive"
                className="w-full gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Logging out...
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4" />
                    Test Logout
                  </>
                )}
              </Button>
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh Token
              </h3>
              <Button
                onClick={handleRefreshToken}
                disabled={isRefreshing || !isAuthenticated}
                variant="outline"
                className="w-full gap-2"
              >
                {isRefreshing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Refresh Token
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {user && (
          <Card>
            <CardHeader>
              <CardTitle>User Data</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <div>
                    <strong>User Data:</strong>
                    <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                      {JSON.stringify(user, null, 2)}
                    </pre>
                  </div>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Supabase Features Demonstrated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li><strong>Authentication:</strong> Login with email and password</li>
              <li><strong>Session Management:</strong> Automatic session handling</li>
              <li><strong>Token Refresh:</strong> Manual token refresh capability</li>
              <li><strong>Logout:</strong> Sign out functionality</li>
              <li><strong>State Management:</strong> Integration with Redux store</li>
              <li><strong>Auto Refresh:</strong> Automatic token refresh on expiry</li>
              <li><strong>Session Persistence:</strong> Sessions persist across page reloads</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
