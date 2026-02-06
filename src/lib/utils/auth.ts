import { supabase } from "../supabase/client";

let cachedToken: string | null = null;
let tokenCacheTime: number = 0;
const TOKEN_CACHE_TTL = 5000

export const getAuthToken = async (): Promise<string | null> => {
  if (cachedToken && Date.now() - tokenCacheTime < TOKEN_CACHE_TTL) {
    return cachedToken;
  }

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.access_token) {
      cachedToken = null;
      tokenCacheTime = 0;
      return null;
    }

    cachedToken = session.access_token;
    tokenCacheTime = Date.now();
    return session.access_token;
  } catch (error) {
    console.error("Error getting auth token:", error);
    cachedToken = null;
    tokenCacheTime = 0;
    return null;
  }
};

export const getAuthTokenSync = (): string | null => {
  if (cachedToken && Date.now() - tokenCacheTime < TOKEN_CACHE_TTL) {
    return cachedToken;
  }
  return null;
};

export const removeAuthToken = async (): Promise<void> => {
  cachedToken = null;
  tokenCacheTime = 0;
  await supabase.auth.signOut();
};
