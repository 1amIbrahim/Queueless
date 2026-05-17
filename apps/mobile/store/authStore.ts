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
  signUp: (email: string, password: string, name: string, phone: string) => Promise<void>
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

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session })
    })
  },

  signIn: async (email, password) => {
    set({ loading: true, error: null })
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) set({ error: error.message })
    set({ loading: false })
  },

  signUp: async (email, password, name, phone) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, phone, role: 'patient' } },
    })
    if (error) {
      set({ error: error.message, loading: false })
      return
    }
    // Insert into public.users
    if (data.user) {
      await supabase.from('users').insert({
        id: data.user.id,
        role: 'patient',
        name,
        phone,
      })
    }
    set({ loading: false })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null })
  },

  clearError: () => set({ error: null }),
}))
