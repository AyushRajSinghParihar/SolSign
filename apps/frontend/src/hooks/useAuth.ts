import { create } from "zustand";
import { supabase } from "../lib/supabase";

// Define the shape of the user object we want to store
type AuthUser = {
  id: string; // The user's UUID from Supabase Auth
  wallet_address: string;
};

type AuthState = {
  user: AuthUser | null; // <-- Store the user object
  token: string | null;
  setAuth: (token: string | null, user: AuthUser | null) => void; // <-- New setter function
  logout: () => void;
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  token: null,
  setAuth: (token, user) => {
    set({ token, user }); // Set both token and user
    if (token) {
      supabase.auth.setSession({ access_token: token, refresh_token: "" });
    } else {
      supabase.auth.signOut();
    }
  },
  logout: () => {
    set({ token: null, user: null }); // Clear both on logout
    supabase.auth.signOut();
  },
}));
