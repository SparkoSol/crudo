const mode = import.meta.env.MODE || "development";
const isDevelopment = mode === "development";
const isProduction = mode === "production";
const isStaging = mode === "staging";

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (isDevelopment) return "http://localhost:3000/api";
  if (isStaging) return "https://api-staging.example.com/api";
  return "https://api.example.com/api";
};

const getReduxSecretKey = () => {
  const key = import.meta.env.VITE_REDUX_SECRET_KEY || "my-super-secret-key-change-in-production";
  
  if (key.length < 16) {
    console.warn(
      "VITE_REDUX_SECRET_KEY should be at least 16 characters long for security."
    );
  }
  
  if (isProduction && key === "my-super-secret-key-change-in-production") {
    console.error(
      "WARNING: Using default Redux secret key in production! " +
        "Please set VITE_REDUX_SECRET_KEY to a secure value."
    );
  }
  
  return key;
};

const getSupabaseUrl = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url) {
    throw new Error("VITE_SUPABASE_URL is required. Please set it in your .env file.");
  }
  return url;
};

const getSupabaseAnonKey = () => {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error("VITE_SUPABASE_ANON_KEY is required. Please set it in your .env file.");
  }
  return key;
};

export const env = {
  apiBaseUrl: getApiBaseUrl(),
  reduxSecretKey: getReduxSecretKey(),
  supabaseUrl: getSupabaseUrl(),
  supabaseAnonKey: getSupabaseAnonKey(),
  mode,
  isDevelopment,
  isProduction,
  isStaging,
} as const;

export const { apiBaseUrl, reduxSecretKey, supabaseUrl, supabaseAnonKey } = env;
export { mode, isDevelopment, isProduction, isStaging };

export default env;
