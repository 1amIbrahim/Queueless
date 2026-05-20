import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert, Animated, Easing,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { apiGet, apiPatch } from '../../lib/api'
import { colors, spacing, radius, font, shadow } from '../../constants/theme'

interface PositionData {
  token: {
    id: string
    number: number
    status: string
    queue_id: string
    patient_name: string | null
    type: string
  }
  position: number
  estimated_wait_minutes: number
}

function statusLabel(status: string) {
  switch (status) {
    case 'waiting':   return { text: 'Waiting', color: colors.amber, bg: colors.amberBg }
    case 'called':    return { text: "It's your turn!", color: colors.green, bg: colors.greenBg }
    case 'completed': return { text: 'Completed', color: colors.gray, bg: colors.grayBg }
    case 'cancelled': return { text: 'Cancelled', color: colors.red, bg: colors.redBg }
    case 'no_show':   return { text: 'Missed', color: colors.red, bg: colors.redBg }
    default:          return { text: status, color: colors.gray, bg: colors.grayBg }
  }
}

function positionText(position: number, status: string) {
  if (status === 'called') return "You're being called now!"
  if (status !== 'waiting') return '—'
  if (position === 1) return "You're next!"
  if (position === 2) return '1 person ahead'
  return `${position - 1} people ahead`
}

export default function MyTokenScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<PositionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const pulse = useRef(new Animated.Value(0)).current
  const calledScale = useRef(new Animated.Value(1)).current

  const fetchPosition = useCallback(async () => {
    try {
      const res = await apiGet<PositionData>(`/tokens/${id}/position`)
      setData(res)
    } catch {
      // keep previous data on error
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchPosition()

    // Realtime: re-fetch whenever this token or any token in the same queue changes
    const channel = supabase
      .channel(`token-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tokens' },
        () => { fetchPosition() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchPosition, id])

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1200,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [pulse])

  const cancelToken = () => {
    Alert.alert(
      'Cancel token?',
      'You will lose your place in the queue.',
      [
        { text: 'Keep my spot', style: 'cancel' },
        {
          text: 'Cancel token',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true)
            try {
              await apiPatch(`/tokens/${id}/cancel`)
              router.back()
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Could not cancel.')
            } finally {
              setCancelling(false)
            }
          },
        },
      ]
    )
  }

  const tokenStatus = data?.token.status ?? 'waiting'
  const positionValue = data?.position ?? 0
  const estimatedWaitValue = data?.estimated_wait_minutes ?? 0
  const status = statusLabel(tokenStatus)
  const isActive = tokenStatus === 'waiting' || tokenStatus === 'called'
  const isCalled = tokenStatus === 'called'

  useEffect(() => {
    if (!isCalled) {
      calledScale.setValue(1)
      return
    }
    Animated.sequence([
      Animated.timing(calledScale, {
        toValue: 1.04,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(calledScale, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start()
  }, [calledScale, isCalled])

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.35],
  })
  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 0],
  })
  const progressWidth = useMemo(() => {
    if (tokenStatus !== 'waiting' || positionValue <= 0) return '0%'
    const ratio = Math.max(8, 100 - positionValue * 8)
    return `${ratio}%`
  }, [positionValue, tokenStatus])

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingState}>
          <Text style={styles.errorText}>Token not found.</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const { token, position, estimated_wait_minutes } = data

  return (
    <SafeAreaView style={[styles.safe, isCalled && styles.safeGreen]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Boarding Pass</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.body}>
        {/* Ticket */}
        <Animated.View
          style={[
            styles.ticket,
            isCalled && styles.ticketCalled,
            shadow.card,
            { transform: [{ scale: calledScale }] },
          ]}
        >
          <View style={styles.ticketTop}>
            <View style={styles.ticketHeaderRow}>
              <Text style={styles.ticketTitle}>QueueLess</Text>
              <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
              </View>
            </View>

            <Text style={styles.ticketLabel}>Token</Text>
            <Text style={[styles.ticketNumber, isCalled && styles.ticketNumberCalled]}>#{token.number}</Text>
            <Text style={styles.ticketSubtitle}>Show this at the counter</Text>
          </View>

          <View style={styles.ticketDivider}>
            <View style={styles.perfLine} />
            <View style={styles.perfNotchLeft} />
            <View style={styles.perfNotchRight} />
          </View>

          <View style={styles.ticketBottom}>
            <View style={styles.ticketInfoRow}>
              <View style={styles.ticketInfoBlock}>
                <Text style={styles.ticketInfoLabel}>Position</Text>
                <Text style={styles.ticketInfoValue}>{position > 0 ? position : '—'}</Text>
              </View>
              <View style={styles.ticketInfoBlock}>
                <Text style={styles.ticketInfoLabel}>Est. Wait</Text>
                <Text style={styles.ticketInfoValue}>
                  {token.status === 'waiting' ? `${estimated_wait_minutes} min` : '—'}
                </Text>
              </View>
              <View style={styles.ticketInfoBlock}>
                <Text style={styles.ticketInfoLabel}>Type</Text>
                <Text style={styles.ticketInfoValue}>{token.type?.toUpperCase?.() ?? 'APP'}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Position info */}
        {isActive && (
          <View style={styles.positionCard}>
            <Text style={styles.positionMain}>{positionText(position, token.status)}</Text>

            {token.status === 'waiting' && position > 0 && (
              <>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: progressWidth }]} />
                </View>
                <Text style={styles.waitTime}>Est. wait: ~{estimated_wait_minutes} min</Text>
              </>
            )}

            {isCalled && (
              <Text style={styles.pleaseReport}>
                Please report to the doctor's room now.
              </Text>
            )}
          </View>
        )}

        {/* Live indicator */}
        {isActive && (
          <View style={styles.liveRow}>
            <View style={styles.liveDotWrap}>
              <Animated.View
                style={[
                  styles.livePulse,
                  { opacity: pulseOpacity, transform: [{ scale: pulseScale }] },
                ]}
              />
              <View style={styles.liveDot} />
            </View>
            <Text style={styles.liveText}>Live — updates automatically</Text>
          </View>
        )}

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Cancel button */}
        {isActive && token.status !== 'called' && (
          <TouchableOpacity
            style={[styles.cancelBtn, cancelling && styles.cancelBtnDisabled]}
            onPress={cancelToken}
            disabled={cancelling}
          >
            {cancelling
              ? <ActivityIndicator size="small" color={colors.red} />
              : <Text style={styles.cancelText}>Cancel Token</Text>
            }
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  safeGreen: { backgroundColor: colors.green },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: font.md, fontWeight: '700', color: colors.white },
  body: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: spacing.lg,
    gap: spacing.md,
  },
  ticket: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  ticketCalled: {
    backgroundColor: colors.greenBg,
  },
  ticketTop: {
    padding: spacing.lg,
    gap: 6,
  },
  ticketHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketTitle: {
    fontSize: font.base,
    fontWeight: '700',
    color: colors.text,
  },
  ticketLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
  },
  ticketNumber: {
    fontSize: 64,
    fontWeight: '800',
    color: colors.primary,
    lineHeight: 70,
  },
  ticketNumberCalled: { color: colors.green },
  ticketSubtitle: {
    fontSize: font.sm,
    color: colors.textSecondary,
  },
  ticketDivider: {
    height: 24,
    justifyContent: 'center',
  },
  perfLine: {
    height: 1,
    marginHorizontal: spacing.lg,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.border,
  },
  perfNotchLeft: {
    position: 'absolute',
    left: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  perfNotchRight: {
    position: 'absolute',
    right: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  ticketBottom: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  ticketInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ticketInfoBlock: {
    alignItems: 'center',
    flex: 1,
  },
  ticketInfoLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  ticketInfoValue: {
    fontSize: font.base,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.full },
  statusText: { fontSize: 12, fontWeight: '700' },
  positionCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  positionMain: { fontSize: font.lg, fontWeight: '700', color: colors.text, textAlign: 'center' },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.full },
  waitTime: { fontSize: font.sm, color: colors.textSecondary, fontWeight: '500' },
  pleaseReport: { fontSize: font.base, color: colors.green, fontWeight: '600', textAlign: 'center' },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  liveDotWrap: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  livePulse: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.green,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green },
  liveText: { fontSize: 12, color: colors.textSecondary },
  cancelBtn: {
    borderWidth: 1.5,
    borderColor: colors.red,
    borderRadius: radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cancelBtnDisabled: { opacity: 0.5 },
  cancelText: { color: colors.red, fontWeight: '700', fontSize: font.base },
  loadingState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  errorText: { fontSize: font.md, color: colors.text },
  backLink: { marginTop: spacing.sm },
  backLinkText: { color: colors.primary, fontWeight: '600' },
})
