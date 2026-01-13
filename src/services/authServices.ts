import { supabase } from "../lib/supabase/client";
import type { User, LoginCredentials, RegisterData } from "../types/auth.types";

export interface AuthResponse {
  user: User;
  session: {
    access_token: string;
    refresh_token: string;
  };
}

export const signIn = async (
  credentials: LoginCredentials
): Promise<AuthResponse> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) {
    throw error;
  }

  if (!data.session || !data.user) {
    throw new Error("No session or user data returned");
  }

  const user: User = {
    id: data.user.id,
    email: data.user.email || "",
    name:
      data.user.user_metadata?.name || data.user.user_metadata?.full_name || "",
    role: data.user.user_metadata?.role || "user",
  };

  return {
    user,
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
  };
};

export const signUp = async (data: RegisterData): Promise<AuthResponse> => {
  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        name: data.name || undefined,
        full_name: data.name || undefined,
      },
    },
  });

  if (error) {
    throw error;
  }

  if (!authData.session || !authData.user) {
    throw new Error("No session or user data returned");
  }

  const user: User = {
    id: authData.user.id,
    email: authData.user.email || "",
    name:
      authData.user.user_metadata?.name ||
      authData.user.user_metadata?.full_name ||
      "",
    role: authData.user.user_metadata?.role || "user",
  };

  return {
    user,
    session: {
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
    },
  };
};

export const signOut = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
};

export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  return data.session;
};

export const getCurrentUser = async (): Promise<User | null> => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }

  if (!data.session?.user) {
    return null;
  }

  return {
    id: data.session.user.id,
    email: data.session.user.email || "",
    name:
      data.session.user.user_metadata?.name ||
      data.session.user.user_metadata?.full_name ||
      "",
    role: data.session.user.user_metadata?.role || "user",
  };
};

export const refreshSession = async () => {
  const { data, error } = await supabase.auth.refreshSession();
  if (error) {
    throw error;
  }
  return data.session;
};

export const onAuthStateChange = (
  callback: (event: string, session: any) => void
) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
};
