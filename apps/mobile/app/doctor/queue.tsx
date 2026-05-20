import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  SafeAreaView, ActivityIndicator, Alert, ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useDoctorStore } from '../../store/doctorStore'
import { useAuthStore } from '../../store/authStore'
import { colors, spacing, radius, font, shadow } from '../../constants/theme'
import ProfilePicker from '../../components/DoctorProfilePicker'

export default function DoctorQueueScreen() {
  const router = useRouter()
  const { signOut } = useAuthStore()
  const { profile, queue, loading, loadProfile, fetchQueue, openQueue, callNext } = useDoctorStore()
  const [calling, setCalling] = useState(false)
  const [todaySeen, setTodaySeen] = useState(0)

  const load = useCallback(async () => {
    await loadProfile()
    await fetchQueue()
  }, [loadProfile, fetchQueue])

  useEffect(() => { load() }, [load])

  // Count completed tokens today
  useEffect(() => {
    if (!profile?.queueId) return
    supabase
      .from('tokens')
      .select('id', { count: 'exact', head: true })
      .eq('queue_id', profile.queueId)
      .eq('status', 'completed')
      .then(({ count }) => setTodaySeen(count ?? 0))
  }, [profile?.queueId, queue])

  // Realtime refresh when tokens change
  useEffect(() => {
    const channel = supabase
      .channel('doctor-queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tokens' },
        () => fetchQueue()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchQueue])

  const handleCallNext = async () => {
    if (!queue || queue.queue_length === 0) return
    setCalling(true)
    const result = await callNext()
    setCalling(false)
    if (result) {
      Alert.alert(
        `Calling Token #${result.called_number}`,
        `${result.remaining} patient${result.remaining !== 1 ? 's' : ''} remaining in queue.`,
        [{ text: 'OK' }]
      )
    }
  }

  // No profile selected yet — show picker
  if (!profile) {
    return <ProfilePicker />
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.doctorName}>{profile.doctorName}</Text>
          <Text style={styles.hospitalName}>{profile.hospitalName}</Text>
        </View>
        <TouchableOpacity onPress={() => signOut()} style={styles.headerBtn}>
          <Ionicons name="log-out-outline" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {loading ? (
          <ActivityIndicator color={colors.teal} size="large" style={{ marginTop: 60 }} />
        ) : !queue ? (
          /* No queue yet today */
          <View style={styles.noQueue}>
            <Ionicons name="calendar-outline" size={56} color={colors.textMuted} />
            <Text style={styles.noQueueTitle}>No queue open today</Text>
            <Text style={styles.noQueueBody}>
              Open your queue to start accepting patients.
            </Text>
            <TouchableOpacity style={styles.openBtn} onPress={openQueue}>
              <Text style={styles.openBtnText}>Open Queue for Today</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Stats row */}
            <View style={styles.statsRow}>
              <StatBox label="Seen Today" value={String(todaySeen)} color={colors.green} />
              <StatBox label="Waiting" value={String(queue.queue_length)} color={colors.primary} />
              <StatBox label="Now Serving" value={queue.last_called_number > 0 ? `#${queue.last_called_number}` : '—'} color={colors.teal} />
            </View>

            {/* Queue status badge */}
            <View style={[styles.statusRow, queue.status !== 'open' && styles.statusPaused]}>
              <View style={[styles.statusDot, { backgroundColor: queue.status === 'open' ? colors.green : colors.amber }]} />
              <Text style={styles.statusText}>
                Queue {queue.status === 'open' ? 'Open' : queue.status === 'paused' ? 'Paused' : 'Closed'}
              </Text>
            </View>

            {/* NEXT PATIENT BUTTON */}
            <TouchableOpacity
              style={[
                styles.nextBtn,
                (calling || queue.queue_length === 0 || queue.status !== 'open') && styles.nextBtnDisabled,
              ]}
              onPress={handleCallNext}
              disabled={calling || queue.queue_length === 0 || queue.status !== 'open'}
              activeOpacity={0.8}
            >
              {calling ? (
                <ActivityIndicator color={colors.white} size="large" />
              ) : (
                <>
                  <Text style={styles.nextBtnText}>Next Patient</Text>
                  <Ionicons name="arrow-forward" size={28} color={colors.white} />
                </>
              )}
            </TouchableOpacity>

            {queue.queue_length === 0 && queue.status === 'open' && (
              <Text style={styles.emptyHint}>Queue is empty — no patients waiting</Text>
            )}

            {/* Upcoming queue */}
            {queue.waiting_tokens.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Up Next</Text>
                {queue.waiting_tokens.slice(0, 6).map((t, i) => (
                  <View key={t.id} style={[styles.tokenRow, shadow.card]}>
                    <View style={[styles.tokenBadge, i === 0 && styles.tokenBadgeNext]}>
                      <Text style={[styles.tokenNum, i === 0 && styles.tokenNumNext]}>
                        #{t.number}
                      </Text>
                    </View>
                    <View style={styles.tokenInfo}>
                      <Text style={styles.tokenName}>{t.patient_name ?? 'Walk-in Patient'}</Text>
                      <Text style={styles.tokenType}>{t.type === 'walkin' ? 'Walk-in' : 'App booking'}</Text>
                    </View>
                    {i === 0 && <Text style={styles.nextLabel}>Next</Text>}
                  </View>
                ))}
              </View>
            )}

            {/* Queue controls */}
            <View style={styles.controls}>
              <Text style={styles.sectionTitle}>Queue Controls</Text>
              <View style={styles.controlRow}>
                <ControlBtn
                  label="Pause"
                  icon="pause-circle-outline"
                  onPress={() => Alert.alert('Pause queue', 'Coming soon')}
                  disabled={queue.status !== 'open'}
                />
                <ControlBtn
                  label="Resume"
                  icon="play-circle-outline"
                  onPress={() => Alert.alert('Resume queue', 'Coming soon')}
                  disabled={queue.status !== 'paused'}
                />
                <ControlBtn
                  label="Change Profile"
                  icon="person-outline"
                  onPress={() => {
                    Alert.alert('Change Doctor Profile', 'This will clear your current selection.', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Continue', onPress: () => useDoctorStore.getState().clearProfile() },
                    ])
                  }}
                />
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function ControlBtn({ label, icon, onPress, disabled }: { label: string; icon: any; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.controlBtn, disabled && styles.controlBtnDisabled]}
    >
      <Ionicons name={icon} size={22} color={disabled ? colors.textMuted : colors.teal} />
      <Text style={[styles.controlBtnText, disabled && { color: colors.textMuted }]}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.teal },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerLeft: { flex: 1 },
  doctorName: { fontSize: font.lg, fontWeight: '800', color: colors.white },
  hospitalName: { fontSize: font.sm, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  headerBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  body: { flex: 1, backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  bodyContent: { padding: spacing.md, paddingBottom: 40 },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statBox: {
    flex: 1, backgroundColor: colors.white, borderRadius: radius.md,
    padding: spacing.md, alignItems: 'center', ...shadow.card,
  },
  statValue: { fontSize: font.xl, fontWeight: '800' },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2, fontWeight: '500' },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.greenBg, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: 8, marginBottom: spacing.md,
  },
  statusPaused: { backgroundColor: colors.amberBg },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: font.sm, fontWeight: '600', color: colors.text },
  nextBtn: {
    backgroundColor: colors.teal,
    borderRadius: radius.lg,
    paddingVertical: 22,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  nextBtnDisabled: { backgroundColor: colors.grayBg },
  nextBtnText: { fontSize: 24, fontWeight: '800', color: colors.white },
  emptyHint: { textAlign: 'center', fontSize: font.sm, color: colors.textMuted, marginBottom: spacing.md },
  section: { marginTop: spacing.md },
  sectionTitle: { fontSize: font.sm, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },
  tokenRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.white, borderRadius: radius.md,
    padding: spacing.sm, marginBottom: spacing.xs,
  },
  tokenBadge: {
    width: 44, height: 44, borderRadius: radius.sm,
    backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center',
  },
  tokenBadgeNext: { backgroundColor: '#e0f7f5' },
  tokenNum: { fontSize: font.base, fontWeight: '800', color: colors.textSecondary },
  tokenNumNext: { color: colors.teal },
  tokenInfo: { flex: 1 },
  tokenName: { fontSize: font.sm, fontWeight: '600', color: colors.text },
  tokenType: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  nextLabel: { fontSize: 11, fontWeight: '700', color: colors.teal },
  controls: { marginTop: spacing.lg },
  controlRow: { flexDirection: 'row', gap: spacing.sm },
  controlBtn: {
    flex: 1, backgroundColor: colors.white, borderRadius: radius.md,
    padding: spacing.sm, alignItems: 'center', gap: 4, ...shadow.card,
  },
  controlBtnDisabled: { opacity: 0.4 },
  controlBtnText: { fontSize: 11, fontWeight: '600', color: colors.teal },
  noQueue: { alignItems: 'center', paddingTop: 60, gap: spacing.sm },
  noQueueTitle: { fontSize: font.lg, fontWeight: '700', color: colors.text },
  noQueueBody: { fontSize: font.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: spacing.xl },
  openBtn: {
    backgroundColor: colors.teal, borderRadius: radius.md,
    paddingHorizontal: spacing.xl, paddingVertical: 14, marginTop: spacing.md,
  },
  openBtnText: { color: colors.white, fontWeight: '700', fontSize: font.base },
})
