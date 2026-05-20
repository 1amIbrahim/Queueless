import { useEffect } from 'react'
import { Slot, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useAuthStore } from '../store/authStore'

export default function RootLayout() {
  const { session, userRole, initialized, init } = useAuthStore()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => { init() }, [])

  useEffect(() => {
    if (!initialized) return

    const inAuthGroup   = segments[0] === '(auth)'
    const inDoctorGroup = segments[0] === 'doctor'
    const inTabsGroup   = segments[0] === '(tabs)'

    if (!session) {
      if (!inAuthGroup) router.replace('/(auth)/login')
      return
    }

    // Logged in — route by role
    if (inAuthGroup) {
      if (userRole === 'doctor') router.replace('/doctor/queue')
      else router.replace('/(tabs)/')
      return
    }

    // Prevent doctor from accessing patient tabs and vice versa
    if (userRole === 'doctor' && (inTabsGroup)) {
      router.replace('/doctor/queue')
    } else if (userRole !== 'doctor' && inDoctorGroup) {
      router.replace('/(tabs)/')
    }
  }, [session, userRole, initialized, segments])

  return (
    <>
      <StatusBar style="light" />
      <Slot />
    </>
  )
}
