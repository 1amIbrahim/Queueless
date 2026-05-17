import { create } from 'zustand'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthState {
  session: Session | null
  initialized: boolean
  loading: boolean
  error: string | null
  init: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  initialized: false,
  loading: false,
  error: null,

  init: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    set({ session, initialized: true })
    supabase.auth.onAuthStateChange((_e, session) => set({ session }))
  },

  signIn: async (email, password) => {
    set({ loading: true, error: null })
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) set({ error: error.message })
    set({ loading: false })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null })
  },

  clearError: () => set({ error: null }),
}))
