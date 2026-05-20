import { Router } from 'express'
import { z } from 'zod'
import { supabase } from '../lib/supabase'

const router = Router()

const specialtyEnum = z.enum([
  'general', 'cardiology', 'dermatology', 'orthopedics', 'pediatrics',
  'gynecology', 'neurology', 'ophthalmology', 'ent', 'psychiatry', 'urology', 'oncology',
])

const registerSchema = z.object({
  role: z.enum(['patient', 'doctor', 'receptionist', 'admin']),
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  phone: z.string().optional(),
  hospital_id: z.string().uuid().optional(),
  specialty: specialtyEnum.optional(),
  doctor_id: z.string().uuid().optional(),
})

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const { role, email, password, name, phone, hospital_id, specialty, doctor_id } = parsed.data

  if ((role === 'doctor' || role === 'receptionist') && !hospital_id) {
    res.status(400).json({ error: 'hospital_id is required for staff accounts' })
    return
  }

  if (role === 'doctor' && !specialty && !doctor_id) {
    res.status(400).json({ error: 'specialty is required to create a doctor profile' })
    return
  }

  try {
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        name: name.trim(),
        phone: phone?.trim() || null,
        role,
        hospital_id: hospital_id ?? null,
      },
    })

    if (createError || !created.user) {
      res.status(400).json({ error: createError?.message ?? 'Could not create user' })
      return
    }

    const userId = created.user.id

    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: userId,
        role,
        name: name.trim(),
        phone: phone?.trim() || null,
        hospital_id: hospital_id ?? null,
      })

    if (profileError) {
      res.status(500).json({ error: profileError.message })
      return
    }

    if (role === 'doctor') {
      if (doctor_id) {
        const { data: existingDoctor } = await supabase
          .from('doctors')
          .select('id, hospital_id, user_id')
          .eq('id', doctor_id)
          .single()

        if (!existingDoctor) {
          res.status(404).json({ error: 'Doctor profile not found' })
          return
        }

        if (existingDoctor.user_id) {
          res.status(409).json({ error: 'Doctor profile already linked to an account' })
          return
        }

        if (hospital_id && existingDoctor.hospital_id !== hospital_id) {
          res.status(400).json({ error: 'Doctor profile does not belong to selected hospital' })
          return
        }

        const { error: linkError } = await supabase
          .from('doctors')
          .update({ user_id: userId })
          .eq('id', doctor_id)

        if (linkError) {
          res.status(500).json({ error: linkError.message })
          return
        }
      } else {
        const { error: doctorError } = await supabase
          .from('doctors')
          .insert({
            user_id: userId,
            hospital_id: hospital_id,
            name: name.trim(),
            specialty: specialty,
          })

        if (doctorError) {
          res.status(500).json({ error: doctorError.message })
          return
        }
      }
    }

    res.status(201).json({ success: true, user_id: userId })
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? 'Registration failed' })
  }
})

export default router
