import { create } from 'zustand'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthState {
  session: Session | null
  userRole: string
  hospitalId: string | null
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
  userRole: 'patient',
  hospitalId: null,
  initialized: false,
  loading: false,
  error: null,

  init: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const { data } = await supabase
        .from('users')
        .select('role, hospital_id')
        .eq('id', session.user.id)
        .single()
      set({ session, userRole: data?.role ?? 'patient', hospitalId: data?.hospital_id ?? null, initialized: true })
    } else {
      set({ session, userRole: 'patient', hospitalId: null, initialized: true })
    }

    supabase.auth.onAuthStateChange(async (_e, nextSession) => {
      if (!nextSession?.user) {
        set({ session: null, userRole: 'patient', hospitalId: null })
        return
      }
      const { data } = await supabase
        .from('users')
        .select('role, hospital_id')
        .eq('id', nextSession.user.id)
        .single()
      set({ session: nextSession, userRole: data?.role ?? 'patient', hospitalId: data?.hospital_id ?? null })
    })
  },

  signIn: async (email, password) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      set({ error: error.message })
    } else if (data.user) {
      const { data: profile } = await supabase
        .from('users')
        .select('role, hospital_id')
        .eq('id', data.user.id)
        .single()
      set({ userRole: profile?.role ?? 'patient', hospitalId: profile?.hospital_id ?? null })
    }
    set({ loading: false })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, userRole: 'patient', hospitalId: null })
  },

  clearError: () => set({ error: null }),
}))
