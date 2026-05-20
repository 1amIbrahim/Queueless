import { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ActivityIndicator, ScrollView,
} from 'react-native'
import { apiGet } from '../lib/api'
import { supabase } from '../lib/supabase'
import { useDoctorStore } from '../store/doctorStore'
import { useAuthStore } from '../store/authStore'
import { colors, spacing, radius, font, shadow } from '../constants/theme'

const LAHORE = { lat: 31.52, lng: 74.36 }

interface Hospital { id: string; name: string }

export default function DoctorProfilePicker() {
  const { saveProfile } = useDoctorStore()
  const { userRole, hospitalId } = useAuthStore()
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null)
  const [doctors, setDoctors] = useState<{ id: string; name: string; specialty: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingDoctors, setLoadingDoctors] = useState(false)

  useEffect(() => {
    apiGet<{ hospitals: Hospital[] }>(
      `/hospitals/nearby?lat=${LAHORE.lat}&lng=${LAHORE.lng}&radius_km=50`
    )
      .then(d => {
        if (userRole === 'doctor' && hospitalId) {
          const own = d.hospitals.find(h => h.id === hospitalId)
          setHospitals(own ? [own] : [])
          if (own) selectHospital(own)
        } else {
          setHospitals(d.hospitals)
        }
      })
      .finally(() => setLoading(false))
  }, [hospitalId, userRole])

  const selectHospital = async (h: Hospital) => {
    setSelectedHospital(h)
    setLoadingDoctors(true)
    try {
      const { data } = await supabase
        .from('doctors')
        .select('id, name, specialty')
        .eq('hospital_id', h.id)
        .eq('is_active', true)
      setDoctors((data as any[]) ?? [])
    } catch {}
    finally { setLoadingDoctors(false) }
  }

  const selectDoctor = (d: { id: string; name: string; specialty: string }) => {
    if (!selectedHospital) return
    saveProfile({
      doctorId: d.id,
      doctorName: d.name,
      specialty: d.specialty,
      hospitalId: selectedHospital.id,
      hospitalName: selectedHospital.name,
      queueId: null,
    })
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Your Profile</Text>
        <Text style={styles.subtitle}>Choose your hospital and name to get started</Text>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {loading ? (
          <ActivityIndicator color={colors.teal} size="large" />
        ) : !selectedHospital ? (
          <>
            <Text style={styles.sectionLabel}>Select Hospital</Text>
            {hospitals.map(h => (
              <TouchableOpacity key={h.id} style={styles.card} onPress={() => selectHospital(h)}>
                <Text style={styles.cardTitle}>{h.name}</Text>
                <Chevron />
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <>
            {userRole !== 'doctor' && (
              <TouchableOpacity style={styles.backRow} onPress={() => setSelectedHospital(null)}>
                <Text style={styles.backText}>← {selectedHospital.name}</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.sectionLabel}>Select Your Name</Text>
            {loadingDoctors ? (
              <ActivityIndicator color={colors.teal} />
            ) : doctors.length === 0 ? (
              <Text style={styles.empty}>No active doctor profiles found for this hospital.</Text>
            ) : (
              doctors.map(d => (
                <TouchableOpacity key={d.id} style={styles.card} onPress={() => selectDoctor(d)}>
                  <View>
                    <Text style={styles.cardTitle}>{d.name}</Text>
                    <Text style={styles.cardSub}>{d.specialty}</Text>
                  </View>
                  <Chevron />
                </TouchableOpacity>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function Chevron() {
  const { Ionicons } = require('@expo/vector-icons')
  return <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.teal },
  header: {
    paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.lg,
  },
  title: { fontSize: font.xl, fontWeight: '800', color: colors.white },
  subtitle: { fontSize: font.sm, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  body: { flex: 1, backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  bodyContent: { padding: spacing.md, paddingBottom: 40, gap: spacing.sm },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4,
  },
  card: {
    backgroundColor: colors.white, borderRadius: radius.md,
    padding: spacing.md, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center', ...shadow.card,
  },
  cardTitle: { fontSize: font.base, fontWeight: '600', color: colors.text },
  cardSub: { fontSize: font.sm, color: colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  backText: { fontSize: font.sm, fontWeight: '600', color: colors.primary },
  empty: { fontSize: font.sm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl },
})
