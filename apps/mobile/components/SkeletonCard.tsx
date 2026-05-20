import { useEffect, useRef } from 'react'
import { View, StyleSheet, Animated } from 'react-native'
import { colors, radius, spacing, shadow } from '../constants/theme'

export default function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start()
  }, [opacity])

  return (
    <Animated.View style={[styles.card, { opacity }, shadow.card]}>
      <View style={styles.row}>
        <View style={styles.iconBox} />
        <View style={styles.lines}>
          <View style={styles.lineTitle} />
          <View style={styles.lineSub} />
        </View>
        <View style={styles.badge} />
      </View>
      <View style={styles.footer}>
        <View style={styles.footerLine} />
        <View style={styles.footerLineShort} />
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBox: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.border },
  lines: { flex: 1, gap: 6 },
  lineTitle: { height: 14, borderRadius: 4, backgroundColor: colors.border, width: '70%' },
  lineSub: { height: 11, borderRadius: 4, backgroundColor: colors.border, width: '45%' },
  badge: { width: 64, height: 24, borderRadius: radius.full, backgroundColor: colors.border },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerLine: { height: 10, borderRadius: 4, backgroundColor: colors.border, width: '35%' },
  footerLineShort: { height: 10, borderRadius: 4, backgroundColor: colors.border, width: '25%' },
})
