import { Request, Response, NextFunction } from 'express'
import { supabase } from '../lib/supabase'

export interface AuthRequest extends Request {
  userId?: string
  userRole?: string
  userHospitalId?: string | null
  accessToken?: string
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    res.status(401).json({ error: 'Missing authorization token' })
    return
  }

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    res.status(401).json({ error: 'Invalid token' })
    return
  }

  req.userId = data.user.id
  const { data: profile } = await supabase
    .from('users')
    .select('role, hospital_id')
    .eq('id', data.user.id)
    .single()

  req.userRole = profile?.role ?? data.user.user_metadata?.role ?? 'patient'
  req.userHospitalId = profile?.hospital_id ?? data.user.user_metadata?.hospital_id ?? null
  req.accessToken = token
  next()
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!roles.includes(req.userRole ?? '')) {
      res.status(403).json({ error: 'Insufficient permissions' })
      return
    }
    next()
  }
}
