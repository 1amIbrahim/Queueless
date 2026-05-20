import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import WaitTimeBadge from './WaitTimeBadge'
import { colors, spacing, radius, font, shadow } from '../constants/theme'
import { SPECIALTIES } from '../constants/specialties'

interface DoctorQueueItem {
  id: string
  name: string
  specialty: string
  queue_id: string | null
  queue_length: number
  estimated_wait_minutes: number
  status: string
}

interface Props {
  doctor: DoctorQueueItem
  onJoin: () => void
  joining: boolean
}

function specialtyLabel(s: string) {
  return SPECIALTIES.find((x) => x.value === s)?.label ?? s
}

export default function DoctorCard({ doctor, onJoin, joining }: Props) {
  const isOpen = doctor.status === 'open' && doctor.queue_id !== null

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{doctor.name.replace('Dr. ', '').charAt(0)}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{doctor.name}</Text>
          <Text style={styles.specialty}>{specialtyLabel(doctor.specialty)}</Text>
          <View style={styles.chipRow}>
            <View style={[styles.chip, isOpen ? styles.chipOpen : styles.chipClosed]}>
              <Text style={[styles.chipText, isOpen ? styles.chipTextOpen : styles.chipTextClosed]}>
                {isOpen ? 'Open' : 'Closed'}
              </Text>
            </View>
            <View style={styles.chipLight}>
              <Ionicons name="time" size={12} color={colors.textSecondary} />
              <Text style={styles.chipLightText}>{doctor.estimated_wait_minutes} min</Text>
            </View>
          </View>
        </View>
        <WaitTimeBadge
          minutes={doctor.estimated_wait_minutes}
          queues={isOpen ? 1 : 0}
        />
      </View>

      <View style={styles.footer}>
        {isOpen ? (
          <>
            <View style={styles.stat}>
              <Ionicons name="people-outline" size={13} color={colors.textSecondary} />
              <Text style={styles.statText}>{doctor.queue_length} waiting</Text>
            </View>
            <TouchableOpacity
              style={[styles.joinBtn, joining && styles.joinBtnDisabled]}
              onPress={onJoin}
              disabled={joining}
            >
              {joining
                ? <ActivityIndicator size="small" color={colors.white} />
                : <Text style={styles.joinText}>Join Queue</Text>
              }
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.closedRow}>
            <Ionicons name="time-outline" size={13} color={colors.textMuted} />
            <Text style={styles.closedText}>
              {doctor.queue_id === null ? 'Queue not started today' : 'Queue paused / closed'}
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 48, height: 48,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: font.md, fontWeight: '700', color: colors.primary },
  info: { flex: 1 },
  name: { fontSize: font.base, fontWeight: '700', color: colors.text },
  specialty: { fontSize: font.sm, color: colors.textSecondary, marginTop: 1 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  chipOpen: { backgroundColor: colors.greenBg },
  chipClosed: { backgroundColor: colors.grayBg },
  chipText: { fontSize: 11, fontWeight: '700' },
  chipTextOpen: { color: colors.green },
  chipTextClosed: { color: colors.textMuted },
  chipLight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.background,
  },
  chipLightText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 12, color: colors.textSecondary },
  joinBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.full,
    minWidth: 100,
    alignItems: 'center',
  },
  joinBtnDisabled: { opacity: 0.6 },
  joinText: { color: colors.white, fontSize: font.sm, fontWeight: '700' },
  closedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  closedText: { fontSize: 12, color: colors.textMuted },
})
