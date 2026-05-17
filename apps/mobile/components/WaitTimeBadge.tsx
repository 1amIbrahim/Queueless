import { View, Text, StyleSheet } from 'react-native'
import { colors, radius, font } from '../constants/theme'

interface Props {
  minutes: number
  queues?: number
}

function waitColor(minutes: number) {
  if (minutes === 0) return { bg: colors.grayBg, text: colors.gray }
  if (minutes <= 15) return { bg: colors.greenBg, text: colors.green }
  if (minutes <= 40) return { bg: colors.amberBg, text: colors.amber }
  return { bg: colors.redBg, text: colors.red }
}

function waitLabel(minutes: number, queues: number) {
  if (queues === 0 || minutes === 0) return 'No queue'
  if (minutes < 60) return `~${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `~${h}h` : `~${h}h ${m}m`
}

export default function WaitTimeBadge({ minutes, queues = 1 }: Props) {
  const c = waitColor(minutes)
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.text }]}>
        {waitLabel(minutes, queues)}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  text: { fontSize: font.sm, fontWeight: '700' },
})
