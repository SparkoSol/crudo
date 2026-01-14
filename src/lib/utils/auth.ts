import { supabase } from "../supabase/client";
import { supabaseUrl } from "../../config/env";

let cachedToken: string | null = null;
let tokenCacheTime: number = 0;
const TOKEN_CACHE_TTL = 5000; 

export const getAuthToken = (): string | null => {
  if (cachedToken && Date.now() - tokenCacheTime < TOKEN_CACHE_TTL) {
    return cachedToken;
  }

  try {
    const url = new URL(supabaseUrl);
    const projectRef = url.hostname.split(".")[0];
    const storageKey = `sb-${projectRef}-auth-token`;
    const sessionStr = localStorage.getItem(storageKey);
    
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      const token = session?.access_token ?? null;
      if (token) {
        cachedToken = token;
        tokenCacheTime = Date.now();
        return token;
      }
    }
  } catch {
    // Ignore errors
  }

  return null;
};


export const removeAuthToken = async (): Promise<void> => {
  cachedToken = null;
  tokenCacheTime = 0;
  await supabase.auth.signOut();
};
