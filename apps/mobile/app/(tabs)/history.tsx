import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  SafeAreaView, RefreshControl, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { colors, spacing, radius, font, shadow } from '../../constants/theme'

interface TokenRecord {
  id: string
  number: number
  type: string
  status: string
  issued_at: string
  queues: {
    date: string
    doctors: {
      name: string
      specialty: string
      hospitals: {
        name: string
      }
    }
  }
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  waiting:   { bg: colors.amberBg,  text: colors.amber },
  called:    { bg: colors.greenBg,  text: colors.green },
  completed: { bg: colors.grayBg,   text: colors.gray },
  cancelled: { bg: colors.redBg,    text: colors.red },
  no_show:   { bg: colors.redBg,    text: colors.red },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PK', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

export default function HistoryScreen() {
  const router = useRouter()
  const { session, signOut } = useAuthStore()
  const [tokens, setTokens] = useState<TokenRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!session?.user.id) return
    const { data } = await supabase
      .from('tokens')
      .select(`
        id, number, type, status, issued_at,
        queues (
          date,
          doctors (
            name, specialty,
            hospitals ( name )
          )
        )
      `)
      .eq('patient_id', session.user.id)
      .order('issued_at', { ascending: false })
      .limit(50)

    setTokens((data as unknown as TokenRecord[]) ?? [])
    setLoading(false)
    setRefreshing(false)
  }, [session])

  useEffect(() => { load() }, [load])

  const onRefresh = () => { setRefreshing(true); load() }

  const isActive = (status: string) => status === 'waiting' || status === 'called'

  const renderItem = ({ item }: { item: TokenRecord }) => {
    const s = STATUS_COLORS[item.status] ?? STATUS_COLORS.completed
    const doctorName = item.queues?.doctors?.name ?? '—'
    const hospitalName = item.queues?.doctors?.hospitals?.name ?? '—'

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => isActive(item.status) && router.push(`/token/${item.id}`)}
        activeOpacity={isActive(item.status) ? 0.7 : 1}
      >
        <View style={styles.cardRow}>
          <View style={styles.tokenNum}>
            <Text style={styles.tokenNumText}>#{item.number}</Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.doctorName} numberOfLines={1}>{doctorName}</Text>
            <Text style={styles.hospitalName} numberOfLines={1}>{hospitalName}</Text>
            <Text style={styles.dateText}>{formatDate(item.issued_at)}</Text>
          </View>
          <View style={styles.cardRight}>
            <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
              <Text style={[styles.statusText, { color: s.text }]}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
            {isActive(item.status) && (
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginTop: 4 }} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>My Tokens</Text>
        <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
          <Ionicons name="log-out-outline" size={20} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={tokens}
          keyExtractor={(t) => t.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No tokens yet</Text>
              <Text style={styles.emptyBody}>
                Join a queue from the Hospitals tab and your tokens will appear here.
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
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
  title: { fontSize: font.xl, fontWeight: '800', color: colors.white },
  signOutBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: { backgroundColor: colors.background, paddingTop: spacing.sm, paddingBottom: 24, flexGrow: 1 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tokenNum: {
    width: 48, height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tokenNumText: { fontSize: font.base, fontWeight: '800', color: colors.primary },
  cardInfo: { flex: 1 },
  doctorName: { fontSize: font.base, fontWeight: '700', color: colors.text },
  hospitalName: { fontSize: font.sm, color: colors.textSecondary, marginTop: 1 },
  dateText: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  cardRight: { alignItems: 'flex-end' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  statusText: { fontSize: 11, fontWeight: '700' },
  loadingState: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  emptyState: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
    marginTop: 60,
  },
  emptyTitle: { fontSize: font.md, fontWeight: '700', color: colors.text },
  emptyBody: { fontSize: font.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
})
