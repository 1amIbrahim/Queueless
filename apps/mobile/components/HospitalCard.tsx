import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { HospitalWithWait } from '@queueless/shared'
import WaitTimeBadge from './WaitTimeBadge'
import { colors, spacing, radius, font, shadow } from '../constants/theme'

interface Props {
  hospital: HospitalWithWait
  onPress: () => void
}

export default function HospitalCard({ hospital, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Ionicons name="medical" size={22} color={colors.primary} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{hospital.name}</Text>
          <Text style={styles.address} numberOfLines={1}>{hospital.address}</Text>
        </View>
        <View style={styles.rightCol}>
          <WaitTimeBadge minutes={hospital.min_wait_minutes} queues={hospital.active_queues} />
          <Text style={styles.distance}>{hospital.distance_km} km</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.stat}>
          <Ionicons name="people-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.statText}>
            {hospital.active_queues === 0
              ? 'No active queues'
              : `${hospital.active_queues} active queue${hospital.active_queues > 1 ? 's' : ''}`}
          </Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="chevron-forward" size={13} color={colors.textMuted} />
          <Text style={styles.seeMore}>See doctors</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: { flex: 1 },
  name: { fontSize: font.base, fontWeight: '700', color: colors.text },
  address: { fontSize: font.sm, color: colors.textSecondary, marginTop: 2 },
  rightCol: { alignItems: 'flex-end', gap: 4 },
  distance: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
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
  seeMore: { fontSize: 12, color: colors.textMuted },
})
