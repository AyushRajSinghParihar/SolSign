import { create } from 'zustand'
import { supabase } from '../lib/supabase'

type AuthState = {
  token: string | null
  setToken: (token: string | null) => void
  logout: () => void
}

export const useAuth = create<AuthState>((set) => ({
  token: null,
  setToken: (token) => {
    set({ token })
    if (token) {
      // Set the session for the Supabase client so it can make authenticated requests
      supabase.auth.setSession({ access_token: token, refresh_token: '' })
    } else {
      // Clear the session on logout
      supabase.auth.signOut()
    }
  },
  logout: () => {
    set({ token: null })
    supabase.auth.signOut()
  },
}))
