import { create } from 'zustand'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { apiPost } from '../lib/api'

interface AuthState {
  session: Session | null
  userRole: string
  hospitalId: string | null
  initialized: boolean
  loading: boolean
  error: string | null
  init: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (params: { email: string; password: string; name: string; phone: string; role: string; hospitalId?: string; specialty?: string }) => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
}

async function fetchProfile(userId: string): Promise<{ role: string; hospitalId: string | null }> {
  const { data } = await supabase
    .from('users')
    .select('role, hospital_id')
    .eq('id', userId)
    .single()
  return { role: data?.role ?? 'patient', hospitalId: data?.hospital_id ?? null }
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
    const profile = session?.user ? await fetchProfile(session.user.id) : { role: 'patient', hospitalId: null }
    set({ session, userRole: profile.role, hospitalId: profile.hospitalId, initialized: true })

    supabase.auth.onAuthStateChange(async (_event, session) => {
      const profile = session?.user ? await fetchProfile(session.user.id) : { role: 'patient', hospitalId: null }
      set({ session, userRole: profile.role, hospitalId: profile.hospitalId })
    })
  },

  signIn: async (email, password) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { set({ error: error.message, loading: false }); return }
    const profile = data.user ? await fetchProfile(data.user.id) : { role: 'patient', hospitalId: null }
    set({ userRole: profile.role, hospitalId: profile.hospitalId, loading: false })
  },

  signUp: async ({ email, password, name, phone, role, hospitalId, specialty }) => {
    set({ loading: true, error: null })
    try {
      await apiPost('/auth/register', {
        role,
        email: email.trim().toLowerCase(),
        password,
        name: name.trim(),
        phone: phone.trim() || undefined,
        hospital_id: hospitalId,
        specialty,
      })
      await supabase.auth.signInWithPassword({ email, password })
    } catch (e: any) {
      set({ error: e.message ?? 'Registration failed', loading: false })
      return
    }
    set({ loading: false })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, userRole: 'patient', hospitalId: null })
  },

  clearError: () => set({ error: null }),
}))
