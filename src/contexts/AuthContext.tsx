import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase/client';
import { getProfile } from '../services/profileServices';
import type { User, Role } from '../types/auth.types';
import type { Profile } from '../types/profile.types';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isProfileLoading: boolean;
  isAuthenticated: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const profileRef = useRef<Profile | null>(null);

  const mapUser = (
    sessionUser: SupabaseUser,
    profileData?: Profile | null
  ): User => {
    let role: Role | undefined;
    if (profileData?.role) {
      const dbRole = profileData.role.toLowerCase();
      if (dbRole === 'manager') {
        role = 'Manager';
      } else if (dbRole === 'sales_representative' || dbRole === 'salesrepresentative') {
        role = 'SalesRepresentative';
      }
    }

    return {
      id: sessionUser.id,
      email: sessionUser.email ?? '',
      name:
        profileData?.full_name ??
        sessionUser.user_metadata?.full_name ??
        undefined,
      role,
    };
  };

  const loadUserAndProfile = useCallback(
    async (sessionUser: SupabaseUser, waitForProfile = false, skipIfProfileExists = false) => {
      const hasExistingProfile = !!profileRef.current;
      
      if (skipIfProfileExists && hasExistingProfile) {
        getProfile(sessionUser.id)
          .then((profileData) => {
            if (profileData) {
              profileRef.current = profileData;
              setProfile(profileData);
              setUser(mapUser(sessionUser, profileData));
            }
          })
          .catch((err) => {
            console.error('Background profile refresh failed:', err);
          });
        return;
      }

      if (!hasExistingProfile) {
        const basicUser = mapUser(sessionUser);
        setUser(basicUser);
      }

      const loadProfile = async () => {
        if (!hasExistingProfile) {
          setIsProfileLoading(true);
        }
        try {
          const profileData = await getProfile(sessionUser.id);
          profileRef.current = profileData;
          setProfile(profileData ?? null);
          setUser(mapUser(sessionUser, profileData));
        } catch (err) {
          console.error('Profile load failed:', err);
          if (!hasExistingProfile) {
            profileRef.current = null;
            setProfile(null);
          }
        } finally {
          setIsProfileLoading(false);
        }
      };

      if (waitForProfile) {
        await loadProfile();
      } else {
        loadProfile().catch(() => {
        });
      }
    },
    []
  );

  const refreshProfile = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      await loadUserAndProfile(session.user);
    }
  };

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    const init = async () => {
      setIsLoading(true);

      timeoutId = setTimeout(() => {
        if (mounted) {
          console.warn('Auth initialization timeout - clearing loading state');
          setIsLoading(false);
        }
      }, 10000);

      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!mounted) {
          if (timeoutId) clearTimeout(timeoutId);
          return;
        }

        if (error) {
          console.error('Session error:', error);
          setUser(null);
          profileRef.current = null;
          setProfile(null);
          if (mounted) setIsLoading(false);
          if (timeoutId) clearTimeout(timeoutId);
          return;
        }

        if (!session?.user) {
          setUser(null);
          profileRef.current = null;
          setProfile(null);
          if (mounted) setIsLoading(false);
          if (timeoutId) clearTimeout(timeoutId);
          return;
        }

        await loadUserAndProfile(session.user, false);
      } catch (err) {
        console.error('Initialization error:', err);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && mounted) {
            setUser(mapUser(session.user));
          } else {
            setUser(null);
          }
        } catch {
          setUser(null);
        }
        profileRef.current = null;
        setProfile(null);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
        if (timeoutId) clearTimeout(timeoutId);
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null);
        profileRef.current = null;
        setProfile(null);
        setIsLoading(false);
        return;
      }

      if (event === 'INITIAL_SESSION') {
        setIsLoading(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        try {
          if (event === 'SIGNED_IN') {
            setIsLoading(true);
          }
          const skipIfProfileExists = event === 'TOKEN_REFRESHED';
          await loadUserAndProfile(session.user, false, skipIfProfileExists);
        } catch (err) {
          console.error('Auth state change error:', err);
        } finally {
          if (event === 'SIGNED_IN') {
            setIsLoading(false);
          }
        }
      }
    });

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [loadUserAndProfile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isProfileLoading,
        isAuthenticated: !!user,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
