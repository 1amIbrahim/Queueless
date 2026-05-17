import { createClient } from '@supabase/supabase-js'
import ws from 'ws'
const url = process.env.SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_KEY!

if (!url || !key) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env')
}

// Base client — used for auth verification and public reads
export const supabase = createClient(url, key, {
  realtime: { transport: ws },
})

// User-scoped client — passes the user's JWT so Supabase sees
// auth.role() = 'authenticated' and auth.uid() = user's id.
// This makes RLS policies work even when using the anon key.
export function userSupabase(accessToken: string) {
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false },
    realtime: { transport: ws },
  })
}
