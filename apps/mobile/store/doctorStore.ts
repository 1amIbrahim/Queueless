import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { apiGet, apiPost } from '../lib/api'

const STORAGE_KEY = 'queueless_doctor_profile'

export interface DoctorProfile {
  doctorId: string
  doctorName: string
  specialty: string
  hospitalId: string
  hospitalName: string
  queueId: string | null
}

interface QueueState {
  id: string
  status: string
  last_called_number: number
  avg_minutes_per_patient: number
  queue_length: number
  waiting_tokens: Token[]
}

interface Token {
  id: string
  number: number
  patient_name: string | null
  type: string
  status: string
}

interface DoctorStoreState {
  profile: DoctorProfile | null
  queue: QueueState | null
  loading: boolean
  loadProfile: () => Promise<void>
  saveProfile: (p: DoctorProfile) => Promise<void>
  clearProfile: () => Promise<void>
  fetchQueue: () => Promise<void>
  openQueue: () => Promise<void>
  callNext: () => Promise<{ called_number: number; remaining: number } | null>
}

export const useDoctorStore = create<DoctorStoreState>((set, get) => ({
  profile: null,
  queue: null,
  loading: false,

  loadProfile: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY)
      if (raw) set({ profile: JSON.parse(raw) })
    } catch {}
  },

  saveProfile: async (p) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(p))
    set({ profile: p })
  },

  clearProfile: async () => {
    await AsyncStorage.removeItem(STORAGE_KEY)
    set({ profile: null, queue: null })
  },

  fetchQueue: async () => {
    const { profile } = get()
    if (!profile) return
    set({ loading: true })
    try {
      const data = await apiGet<{ queues: any[] }>(`/hospitals/${profile.hospitalId}/queues`)
      const q = data.queues.find((x: any) => x.doctors?.id === profile.doctorId)
      if (!q) {
        set({ queue: null, loading: false })
        return
      }

      // Get full queue with tokens
      const full = await apiGet<{ queue: any; tokens: Token[] }>(`/queues/${q.id}`)

      set({
        profile: { ...profile, queueId: q.id },
        queue: {
          id: q.id,
          status: q.status,
          last_called_number: q.last_called_number ?? 0,
          avg_minutes_per_patient: q.avg_minutes_per_patient ?? 10,
          queue_length: q.queue_length ?? 0,
          waiting_tokens: full.tokens ?? [],
        },
        loading: false,
      })

      // Persist updated queueId
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...profile, queueId: q.id }))
    } catch {
      set({ loading: false })
    }
  },

  openQueue: async () => {
    const { profile, fetchQueue } = get()
    if (!profile) return
    try {
      await apiPost('/queues', { doctor_id: profile.doctorId })
    } catch {}
    await fetchQueue()
  },

  callNext: async () => {
    const { profile, fetchQueue } = get()
    if (!profile?.queueId) return null
    try {
      const res = await apiPost<any>('/tokens/call-next', { queue_id: profile.queueId })
      await fetchQueue()
      return {
        called_number: res.called_token?.number ?? 0,
        remaining: res.remaining ?? 0,
      }
    } catch {
      return null
    }
  },
}))
