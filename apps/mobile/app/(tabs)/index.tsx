import { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, SafeAreaView,
} from 'react-native'
import { useRouter } from 'expo-router'
import * as Location from 'expo-location'
import { Ionicons } from '@expo/vector-icons'
import { HospitalWithWait, Specialty } from '@queueless/shared'
import { apiGet } from '../../lib/api'
import HospitalCard from '../../components/HospitalCard'
import SpecialtyPicker from '../../components/SpecialtyPicker'
import SkeletonCard from '../../components/SkeletonCard'
import { colors, spacing, font } from '../../constants/theme'

type Tab = 'nearby' | 'specialty'

const LAHORE = { lat: 31.5204, lng: 74.3587 }
const REFRESH_INTERVAL = 30_000

export default function ComparisonScreen() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('nearby')
  const [specialty, setSpecialty] = useState<Specialty | null>(null)
  const [hospitals, setHospitals] = useState<HospitalWithWait[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [location, setLocation] = useState(LAHORE)
  const [locationName, setLocationName] = useState('Lahore')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') return
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
    setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude })
    const [place] = await Location.reverseGeocodeAsync(loc.coords)
    if (place?.city) setLocationName(place.city)
  }

  const fetchHospitals = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        lat: String(location.lat),
        lng: String(location.lng),
        radius_km: '25',
      })
      if (tab === 'specialty' && specialty) {
        params.set('specialty', specialty)
      }
      const data = await apiGet<{ hospitals: HospitalWithWait[] }>(
        `/hospitals/nearby?${params}`
      )
      setHospitals(data.hospitals)
    } catch (e: any) {
      setError(e.message ?? 'Could not load hospitals')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [location, tab, specialty])

  // Initial load + location
  useEffect(() => {
    fetchLocation()
  }, [])

  // Fetch on tab/specialty/location change
  useEffect(() => {
    fetchHospitals()
  }, [fetchHospitals])

  // Auto-refresh every 30s
  useEffect(() => {
    intervalRef.current = setInterval(() => fetchHospitals(true), REFRESH_INTERVAL)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [fetchHospitals])

  const onRefresh = () => {
    setRefreshing(true)
    fetchHospitals()
  }

  const renderEmpty = () => {
    if (loading) return null
    return (
      <View style={styles.emptyState}>
        <Ionicons name="search-outline" size={48} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>No hospitals found</Text>
        <Text style={styles.emptyBody}>
          {tab === 'specialty' && specialty
            ? 'No hospitals with this specialty found nearby. Try a different specialty.'
            : 'No hospitals found within 25 km. Pull down to refresh.'}
        </Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>QueueLess</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={13} color="rgba(255,255,255,0.8)" />
            <Text style={styles.locationText}>{locationName}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => fetchLocation()} style={styles.refreshBtn}>
          <Ionicons name="locate" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Tab switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, tab === 'nearby' && styles.tabActive]}
          onPress={() => { setTab('nearby'); setSpecialty(null) }}
        >
          <Text style={[styles.tabText, tab === 'nearby' && styles.tabTextActive]}>
            Nearby
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'specialty' && styles.tabActive]}
          onPress={() => setTab('specialty')}
        >
          <Text style={[styles.tabText, tab === 'specialty' && styles.tabTextActive]}>
            By Specialty
          </Text>
        </TouchableOpacity>
      </View>

      {/* Specialty picker (shown when tab = specialty) */}
      {tab === 'specialty' && (
        <SpecialtyPicker selected={specialty} onSelect={setSpecialty} />
      )}

      {/* Body */}
      {loading ? (
        <View style={styles.list}>
          <Text style={styles.sectionLabel}>Finding hospitals near you…</Text>
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </View>
      ) : error ? (
        <View style={styles.emptyState}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Could not load</Text>
          <Text style={styles.emptyBody}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchHospitals()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={hospitals}
          keyExtractor={(h) => h.id}
          renderItem={({ item }) => (
            <HospitalCard
              hospital={item}
              onPress={() => router.push(`/hospital/${item.id}`)}
            />
          )}
          ListEmptyComponent={renderEmpty}
          ListHeaderComponent={
            <Text style={styles.sectionLabel}>
              {hospitals.length} hospital{hospitals.length !== 1 ? 's' : ''} — sorted by shortest wait
            </Text>
          }
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  appName: { fontSize: font.xl, fontWeight: '800', color: colors.white, letterSpacing: -0.5 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  locationText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  refreshBtn: {
    width: 38, height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 10,
    padding: 3,
  },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: colors.white },
  tabText: { fontSize: font.sm, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },
  tabTextActive: { color: colors.primary },
  list: { backgroundColor: colors.background, paddingTop: spacing.sm, paddingBottom: 24, flexGrow: 1 },
  sectionLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  loadingState: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  loadingText: { color: colors.textSecondary, fontSize: font.sm },
  emptyState: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: { fontSize: font.md, fontWeight: '700', color: colors.text },
  emptyBody: { fontSize: font.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: { color: colors.white, fontWeight: '600', fontSize: font.sm },
})
