import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert,
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
  const status = statusLabel(token.status)
  const isActive = token.status === 'waiting' || token.status === 'called'
  const isCalled = token.status === 'called'

  return (
    <SafeAreaView style={[styles.safe, isCalled && styles.safeGreen]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Token</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.body}>
        {/* Token Number Card */}
        <View style={[styles.tokenCard, isCalled && styles.tokenCardGreen, shadow.card]}>
          <Text style={styles.tokenLabel}>Token Number</Text>
          <Text style={[styles.tokenNumber, isCalled && styles.tokenNumberGreen]}>
            #{token.number}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
          </View>
        </View>

        {/* Position info */}
        {isActive && (
          <View style={styles.positionCard}>
            <Text style={styles.positionMain}>{positionText(position, token.status)}</Text>

            {token.status === 'waiting' && position > 0 && (
              <>
                {/* Progress bar */}
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.max(5, 100 - position * 10)}%` }
                    ]}
                  />
                </View>
                <Text style={styles.waitTime}>
                  Est. wait: ~{estimated_wait_minutes} min
                </Text>
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
            <View style={styles.liveDot} />
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    gap: spacing.md,
  },
  tokenCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  tokenCardGreen: { backgroundColor: colors.greenBg },
  tokenLabel: { fontSize: font.sm, color: colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  tokenNumber: { fontSize: 72, fontWeight: '800', color: colors.primary, lineHeight: 80 },
  tokenNumberGreen: { color: colors.green },
  statusBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: radius.full },
  statusText: { fontSize: font.sm, fontWeight: '700' },
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
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
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
