import { useEffect, useState } from 'react'
import { Slot, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuthStore } from '../store/authStore'

export default function RootLayout() {
  const { session, userRole, initialized, init } = useAuthStore()
  const router = useRouter()
  const segments = useSegments()
  const [onboarded, setOnboarded] = useState<boolean | null>(null)

  useEffect(() => {
    init()
    AsyncStorage.getItem('queueless_onboarded').then(v => setOnboarded(v === 'true'))
  }, [])

  useEffect(() => {
    if (!initialized || onboarded === null) return

    const inAuth    = segments[0] === '(auth)'
    const inDoctor  = segments[0] === 'doctor'
    const inTabs    = segments[0] === '(tabs)'

    // New user — show onboarding before login
    if (!session && !inAuth) {
      if (!onboarded) {
        router.replace('/(auth)/onboarding')
      } else {
        router.replace('/(auth)/login')
      }
      return
    }

    // Logged in — route by role
    if (session && inAuth) {
      if (userRole === 'doctor') router.replace('/doctor/queue')
      else router.replace('/(tabs)/')
      return
    }

    // Guard: prevent role mismatch
    if (session && userRole === 'doctor' && inTabs) {
      router.replace('/doctor/queue')
    } else if (session && userRole !== 'doctor' && inDoctor) {
      router.replace('/(tabs)/')
    }
  }, [session, userRole, initialized, onboarded, segments])

  return (
    <>
      <StatusBar style="light" />
      <Slot />
    </>
  )
}
