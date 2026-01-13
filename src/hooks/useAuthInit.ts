import { useAuth } from "../contexts/AuthContext";

export const useAuthInit = () => {
  return useAuth();
};
