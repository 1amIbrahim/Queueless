import { useEffect } from 'react'
import { Slot, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useAuthStore } from '../store/authStore'

export default function RootLayout() {
  const { session, initialized, init } = useAuthStore()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => { init() }, [])

  useEffect(() => {
    if (!initialized) return
    const inAuthGroup = segments[0] === '(auth)'
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login')
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)/')
    }
  }, [session, initialized, segments])

  return (
    <>
      <StatusBar style="light" />
      <Slot />
    </>
  )
}
