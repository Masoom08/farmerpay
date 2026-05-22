import { createContext } from "react";
import { StoredUser } from "../types/auth.types";

export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: StoredUser | null;
  login: (user: StoredUser) => void;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);