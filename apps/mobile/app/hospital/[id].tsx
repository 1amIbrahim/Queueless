import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, SafeAreaView, Alert, Linking,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { apiGet, apiPost } from '../../lib/api'
import { IssueTokenResponse } from '@queueless/shared'
import DoctorCard from '../../components/DoctorCard'
import { colors, spacing, radius, font, shadow } from '../../constants/theme'

interface HospitalDetail {
  id: string
  name: string
  address: string
  phone: string
  lat: number
  lng: number
}

interface QueueItem {
  id: string
  status: string
  queue_length: number
  estimated_wait_minutes: number
  doctors: {
    id: string
    name: string
    specialty: string
  }
}

export default function HospitalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [hospital, setHospital] = useState<HospitalDetail | null>(null)
  const [queues, setQueues] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [joiningQueueId, setJoiningQueueId] = useState<string | null>(null)
  const fastestWait = queues.length
    ? Math.min(...queues.map(q => q.estimated_wait_minutes || 999))
    : null

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiGet<{ queues: QueueItem[] }>(`/hospitals/${id}/queues`)
      setQueues(data.queues)

      // Grab hospital info from the first queue's context or fetch from nearby
      // We'll use a quick nearby fetch to get hospital details
      const nearby = await apiGet<{ hospitals: HospitalDetail[] }>(
        `/hospitals/nearby?lat=31.52&lng=74.36&radius_km=50`
      )
      const h = (nearby.hospitals as any[]).find((x: any) => x.id === id)
      if (h) setHospital(h)
    } catch {
      // silent — show what we have
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const joinQueue = async (queue: QueueItem) => {
    setJoiningQueueId(queue.id)
    try {
      const res = await apiPost<IssueTokenResponse>('/tokens', {
        queue_id: queue.id,
        type: 'app',
      })
      Alert.alert(
        `Token #${res.token.number} issued!`,
        `You are position ${res.position} in line.\nEstimated wait: ${res.estimated_wait_minutes} min.`,
        [
          { text: 'Track Live', onPress: () => router.push(`/token/${res.token.id}`) },
          { text: 'Close', style: 'cancel' },
        ]
      )
    } catch (e: any) {
      Alert.alert('Could not join queue', e.message ?? 'Please try again.')
    } finally {
      setJoiningQueueId(null)
    }
  }

  const callHospital = () => {
    if (hospital?.phone) Linking.openURL(`tel:${hospital.phone}`)
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.backRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.hospitalName} numberOfLines={1}>
            {hospital?.name ?? 'Hospital'}
          </Text>
          {hospital?.address ? (
            <Text style={styles.hospitalAddress} numberOfLines={1}>{hospital.address}</Text>
          ) : null}
        </View>
        {hospital?.phone ? (
          <TouchableOpacity onPress={callHospital} style={styles.callBtn}>
            <Ionicons name="call" size={18} color={colors.white} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Doctor queue list */}
      <FlatList
        data={queues}
        keyExtractor={(q) => q.id}
        renderItem={({ item }) => {
          if (!item.doctors) return null
          return (
          <DoctorCard
            doctor={{
              id: item.doctors.id,
              name: item.doctors.name,
              specialty: item.doctors.specialty,
              queue_id: item.id,
              queue_length: item.queue_length,
              estimated_wait_minutes: item.estimated_wait_minutes,
              status: item.status,
            }}
            onJoin={() => joinQueue(item)}
            joining={joiningQueueId === item.id}
          />
          )
        }}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={[styles.heroCard, shadow.card]}>
              <View style={styles.heroTopRow}>
                <View>
                  <Text style={styles.heroTitle}>Hospital Overview</Text>
                  <Text style={styles.heroSubtitle} numberOfLines={2}>
                    {hospital?.address ?? 'Address unavailable'}
                  </Text>
                </View>
                <View style={styles.heroBadge}>
                  <Ionicons name="time" size={14} color={colors.primary} />
                  <Text style={styles.heroBadgeText}>Live</Text>
                </View>
              </View>
              <View style={styles.heroStats}>
                <View style={styles.heroStatBlock}>
                  <Text style={styles.heroStatValue}>{queues.length}</Text>
                  <Text style={styles.heroStatLabel}>Doctors</Text>
                </View>
                <View style={styles.heroStatBlock}>
                  <Text style={styles.heroStatValue}>
                    {fastestWait === null || fastestWait === 999 ? '—' : `${fastestWait}m`}
                  </Text>
                  <Text style={styles.heroStatLabel}>Fastest</Text>
                </View>
                <View style={styles.heroStatBlock}>
                  <Text style={styles.heroStatValue}>{queues.filter(q => q.status === 'open').length}</Text>
                  <Text style={styles.heroStatLabel}>Open Queues</Text>
                </View>
              </View>
              <View style={styles.heroActions}>
                <TouchableOpacity style={styles.heroAction} onPress={callHospital}>
                  <Ionicons name="call" size={16} color={colors.white} />
                  <Text style={styles.heroActionText}>Call</Text>
                </TouchableOpacity>
                {hospital?.lat && hospital?.lng ? (
                  <TouchableOpacity
                    style={[styles.heroAction, styles.heroActionGhost]}
                    onPress={() => Linking.openURL(`https://maps.google.com/?q=${hospital.lat},${hospital.lng}`)}
                  >
                    <Ionicons name="navigate" size={16} color={colors.primary} />
                    <Text style={[styles.heroActionText, styles.heroActionGhostText]}>Directions</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
            <Text style={styles.sectionLabel}>
              {queues.length} doctor{queues.length !== 1 ? 's' : ''} available today
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No queues open today</Text>
            <Text style={styles.emptyBody}>Check back during working hours or call the hospital.</Text>
          </View>
        }
        contentContainerStyle={styles.list}
        onRefresh={load}
        refreshing={loading}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: { flex: 1 },
  hospitalName: { fontSize: font.md, fontWeight: '700', color: colors.white },
  hospitalAddress: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  callBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: { backgroundColor: colors.background, paddingTop: spacing.sm, paddingBottom: 24, flexGrow: 1 },
  listHeader: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  heroCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  heroTitle: { fontSize: font.base, fontWeight: '700', color: colors.text },
  heroSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2, maxWidth: 220 },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
  },
  heroBadgeText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  heroStatBlock: { alignItems: 'center', flex: 1 },
  heroStatValue: { fontSize: font.lg, fontWeight: '700', color: colors.text },
  heroStatLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  heroActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  heroAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  heroActionText: { color: colors.white, fontWeight: '700', fontSize: 12 },
  heroActionGhost: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  heroActionGhostText: { color: colors.primary },
  sectionLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    paddingBottom: spacing.sm,
  },
  loadingState: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 60,
  },
  emptyTitle: { fontSize: font.md, fontWeight: '700', color: colors.text },
  emptyBody: { fontSize: font.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
})
