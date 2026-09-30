import { createContext } from "react";
import type { Profile, Session } from "../types/api";
export interface AuthState {
  readonly session: Session | null;
  readonly validatedToken: string | null;
  readonly startSession: (token: string, user: Profile) => void;
  readonly updateUser: (user: Profile) => void;
  readonly logout: () => void;
}
export const AuthContext = createContext<AuthState | null>(null);
