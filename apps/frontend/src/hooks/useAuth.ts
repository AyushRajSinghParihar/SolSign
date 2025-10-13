import { create } from "zustand";
import { persist } from "zustand/middleware";
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
  restoreSession: () => Promise<void>;
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
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
        localStorage.removeItem("auth-storage");
      },
      restoreSession: async () => {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          // If there's a Supabase session, sync it with our Zustand store
          const token = data.session.access_token;
          const userId = data.session.user?.id;
          const walletAddress = data.session.user?.app_metadata?.wallet_address;
          
          if (userId && walletAddress) {
            set({
              token,
              user: {
                id: userId,
                wallet_address: walletAddress,
              },
            });
          }
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
