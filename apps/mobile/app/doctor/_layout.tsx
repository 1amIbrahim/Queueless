import { Stack } from 'expo-router'
import { colors } from '../../constants/theme'

export default function DoctorLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.teal },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
      }}
    />
  )
}
