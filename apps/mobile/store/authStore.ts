import { create } from 'zustand'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthState {
  session: Session | null
  userRole: string
  initialized: boolean
  loading: boolean
  error: string | null
  init: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string, phone: string) => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
}

async function fetchRole(userId: string): Promise<string> {
  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()
  return data?.role ?? 'patient'
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  userRole: 'patient',
  initialized: false,
  loading: false,
  error: null,

  init: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const role = session?.user ? await fetchRole(session.user.id) : 'patient'
    set({ session, userRole: role, initialized: true })

    supabase.auth.onAuthStateChange(async (_event, session) => {
      const role = session?.user ? await fetchRole(session.user.id) : 'patient'
      set({ session, userRole: role })
    })
  },

  signIn: async (email, password) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { set({ error: error.message, loading: false }); return }
    const role = data.user ? await fetchRole(data.user.id) : 'patient'
    set({ userRole: role, loading: false })
  },

  signUp: async (email, password, name, phone) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, phone, role: 'patient' } },
    })
    if (error) { set({ error: error.message, loading: false }); return }
    if (data.user) {
      await supabase.from('users').insert({
        id: data.user.id, role: 'patient', name, phone,
      })
    }
    set({ loading: false })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, userRole: 'patient' })
  },

  clearError: () => set({ error: null }),
}))
