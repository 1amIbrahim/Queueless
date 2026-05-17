import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native'
import { Specialty } from '@queueless/shared'
import { SPECIALTIES } from '../constants/specialties'
import { colors, radius, font, spacing } from '../constants/theme'

interface Props {
  selected: Specialty | null
  onSelect: (s: Specialty | null) => void
}

export default function SpecialtyPicker({ selected, onSelect }: Props) {
  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        <TouchableOpacity
          style={[styles.chip, selected === null && styles.chipActive]}
          onPress={() => onSelect(null)}
        >
          <Text style={[styles.chipText, selected === null && styles.chipTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        {SPECIALTIES.map((s) => (
          <TouchableOpacity
            key={s.value}
            style={[styles.chip, selected === s.value && styles.chipActive]}
            onPress={() => onSelect(selected === s.value ? null : s.value)}
          >
            <Text style={[styles.chipText, selected === s.value && styles.chipTextActive]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: spacing.md, gap: 8, paddingVertical: spacing.sm },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: font.sm, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: colors.white },
})
