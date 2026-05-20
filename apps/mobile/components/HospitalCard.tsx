import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { HospitalWithWait } from '@queueless/shared'
import { colors, spacing, radius, font } from '../constants/theme'

interface Props {
  hospital: HospitalWithWait
  onPress: () => void
}

interface WaitInfo {
  label: string
  sublabel: string
  color: string
  bg: string
  dotColor: string
  iconName: 'checkmark-circle' | 'time' | 'warning' | 'remove-circle'
}

function getWaitInfo(minutes: number, queues: number): WaitInfo {
  if (queues === 0 || minutes === 0)
    return { label: 'No queue', sublabel: 'Walk in anytime', color: colors.gray, bg: colors.grayBg, dotColor: '#9ca3af', iconName: 'remove-circle' }
  if (minutes <= 15)
    return { label: `~${minutes} min`, sublabel: 'Short wait', color: '#15803d', bg: '#dcfce7', dotColor: '#22c55e', iconName: 'checkmark-circle' }
  if (minutes <= 40)
    return { label: `~${minutes} min`, sublabel: 'Moderate wait', color: '#92400e', bg: '#fef3c7', dotColor: '#f59e0b', iconName: 'time' }
  return { label: `~${minutes} min`, sublabel: 'Long wait', color: '#991b1b', bg: '#fee2e2', dotColor: '#ef4444', iconName: 'warning' }
}

export default function HospitalCard({ hospital, onPress }: Props) {
  const wait = getWaitInfo(hospital.min_wait_minutes, hospital.active_queues)

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.72}
    >
      {/* Top row */}
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.name} numberOfLines={1}>{hospital.name}</Text>
          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={11} color={colors.textMuted} />
            <Text style={styles.address} numberOfLines={1}>{hospital.address}</Text>
          </View>
        </View>
        <View style={styles.distancePill}>
          <Text style={styles.distanceText}>{hospital.distance_km} km</Text>
        </View>
      </View>

      {/* Wait time banner */}
      <View style={[styles.waitBanner, { backgroundColor: wait.bg }]}>
        <View style={styles.waitLeft}>
          <View style={[styles.dot, { backgroundColor: wait.dotColor }]} />
          <View>
            <Text style={[styles.waitTime, { color: wait.color }]}>{wait.label}</Text>
            <Text style={[styles.waitSub, { color: wait.color }]}>{wait.sublabel}</Text>
          </View>
        </View>
        <View style={styles.waitRight}>
          {hospital.active_queues > 0 && (
            <Text style={[styles.queueCount, { color: wait.color }]}>
              {hospital.active_queues} {hospital.active_queues === 1 ? 'doctor' : 'doctors'} open
            </Text>
          )}
          <View style={[styles.arrowCircle, { backgroundColor: wait.color }]}>
            <Ionicons name="arrow-forward" size={12} color="#fff" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    marginHorizontal: spacing.md,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  titleBlock: { flex: 1 },
  name: { fontSize: font.base, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  address: { fontSize: 12, color: colors.textMuted, flex: 1 },
  distancePill: {
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    flexShrink: 0,
  },
  distanceText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  waitBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    marginTop: 2,
  },
  waitLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  waitTime: { fontSize: font.md, fontWeight: '800', letterSpacing: -0.3 },
  waitSub: { fontSize: 11, fontWeight: '600', marginTop: 1, opacity: 0.8 },
  waitRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  queueCount: { fontSize: 11, fontWeight: '600', opacity: 0.75 },
  arrowCircle: {
    width: 24, height: 24, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    opacity: 0.85,
  },
})
