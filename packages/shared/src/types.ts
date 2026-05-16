// ─── User & Auth ─────────────────────────────────────────────────────────────

export type UserRole = 'patient' | 'receptionist' | 'doctor' | 'admin'

export interface User {
  id: string
  role: UserRole
  name: string
  phone: string
  hospital_id: string | null
  created_at: string
}

// ─── Hospital ─────────────────────────────────────────────────────────────────

export interface Hospital {
  id: string
  name: string
  lat: number
  lng: number
  address: string
  phone: string
  created_at: string
}

export interface HospitalWithWait extends Hospital {
  distance_km: number
  min_wait_minutes: number
  active_queues: number
}

// ─── Department ───────────────────────────────────────────────────────────────

export type Specialty =
  | 'general'
  | 'cardiology'
  | 'dermatology'
  | 'orthopedics'
  | 'pediatrics'
  | 'gynecology'
  | 'neurology'
  | 'ophthalmology'
  | 'ent'
  | 'psychiatry'
  | 'urology'
  | 'oncology'

export interface Department {
  id: string
  hospital_id: string
  name: string
  specialty: Specialty
}

// ─── Doctor ───────────────────────────────────────────────────────────────────

export interface Doctor {
  id: string
  user_id: string
  hospital_id: string
  department_id: string
  name: string
  specialty: Specialty
  working_hours: WorkingHours
  is_active: boolean
}

export interface WorkingHours {
  start: string  // "09:00"
  end: string    // "17:00"
  days: number[] // 0=Sun, 1=Mon … 6=Sat
}

export interface DoctorWithQueue extends Doctor {
  queue_id: string | null
  queue_length: number
  estimated_wait_minutes: number
  current_token_number: number | null
}

// ─── Queue ────────────────────────────────────────────────────────────────────

export type QueueStatus = 'open' | 'paused' | 'closed'

export interface Queue {
  id: string
  doctor_id: string
  date: string  // ISO date "2026-05-16"
  current_number: number
  last_called_number: number
  status: QueueStatus
  avg_minutes_per_patient: number
  created_at: string
}

// ─── Token ────────────────────────────────────────────────────────────────────

export type TokenType = 'app' | 'walkin'
export type TokenStatus = 'waiting' | 'called' | 'completed' | 'no_show' | 'cancelled'

export interface Token {
  id: string
  queue_id: string
  patient_id: string | null
  patient_name: string | null
  patient_phone: string | null
  number: number
  type: TokenType
  status: TokenStatus
  issued_at: string
  called_at: string | null
  completed_at: string | null
}

export interface TokenWithPosition extends Token {
  position: number          // 1 = next up
  estimated_wait_minutes: number
}

// ─── Appointment ──────────────────────────────────────────────────────────────

export interface Appointment {
  id: string
  token_id: string
  patient_id: string
  doctor_id: string
  hospital_id: string
  booked_at: string
  notes: string | null
}

// ─── Notification ─────────────────────────────────────────────────────────────

export type NotificationChannel = 'sms' | 'whatsapp'

export interface Notification {
  id: string
  token_id: string
  channel: NotificationChannel
  message: string
  sent_at: string
  delivered: boolean
}

// ─── API Request / Response shapes ───────────────────────────────────────────

export interface IssueTokenRequest {
  queue_id: string
  patient_id?: string
  patient_name?: string
  patient_phone?: string
  type: TokenType
}

export interface IssueTokenResponse {
  token: Token
  position: number
  estimated_wait_minutes: number
}

export interface CallNextPatientRequest {
  queue_id: string
  doctor_id: string
}

export interface CallNextPatientResponse {
  called_token: Token
  next_token: Token | null
  remaining: number
}

export interface NearbyHospitalsRequest {
  lat: number
  lng: number
  radius_km?: number
  specialty?: Specialty
}
