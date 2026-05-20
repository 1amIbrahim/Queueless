import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, ScrollView,
} from 'react-native'
import { Link } from 'expo-router'
import { useAuthStore } from '../../store/authStore'
import { apiGet } from '../../lib/api'
import { colors, spacing, radius, font, shadow } from '../../constants/theme'
import { SPECIALTIES } from '../../constants/specialties'

type Role = 'patient' | 'doctor'

interface Hospital { id: string; name: string; address: string }

export default function SignupScreen() {
  const { signUp, loading, error, clearError } = useAuthStore()
  const [role, setRole] = useState<Role>('patient')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null)
  const [specialty, setSpecialty] = useState<string | null>(null)

  useEffect(() => {
    apiGet<{ hospitals: Hospital[] }>(
      '/hospitals/nearby?lat=31.52&lng=74.36&radius_km=50'
    ).then(d => setHospitals(d.hospitals)).catch(() => {})
  }, [])

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password) return
    if (role === 'doctor' && (!selectedHospitalId || !specialty)) return
    clearError()
    await signUp({
      email: email.trim().toLowerCase(),
      password,
      name: name.trim(),
      phone: phone.trim(),
      role,
      hospitalId: selectedHospitalId ?? undefined,
      specialty: specialty ?? undefined,
    })
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.bgDecor}>
        <View style={styles.orbOne} />
        <View style={styles.orbTwo} />
      </View>

      <View style={styles.header}>
        <Text style={styles.kicker}>CREATE ACCOUNT</Text>
        <Text style={styles.logo}>QueueLess</Text>
        <Text style={styles.tagline}>Set up your patient pass in minutes.</Text>
      </View>

      <ScrollView
        style={[styles.form, shadow.card]}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Start your account</Text>

        <Text style={styles.label}>Account Type</Text>
        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[styles.roleChip, role === 'patient' && styles.roleChipActive]}
            onPress={() => setRole('patient')}
          >
            <Text style={[styles.roleChipText, role === 'patient' && styles.roleChipTextActive]}>Patient</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleChip, role === 'doctor' && styles.roleChipActive]}
            onPress={() => setRole('doctor')}
          >
            <Text style={[styles.roleChipText, role === 'doctor' && styles.roleChipTextActive]}>Doctor</Text>
          </TouchableOpacity>
        </View>

        {role === 'doctor' && (
          <View style={styles.staffBlock}>
            <Text style={styles.staffTitle}>Doctor Details</Text>
            <Text style={styles.staffHint}>Select your hospital and specialty</Text>

            <Text style={styles.label}>Hospital</Text>
            <View style={styles.hospitalList}>
              {hospitals.map(h => (
                <TouchableOpacity
                  key={h.id}
                  style={[styles.hospitalCard, selectedHospitalId === h.id && styles.hospitalCardActive]}
                  onPress={() => setSelectedHospitalId(h.id)}
                >
                  <Text style={styles.hospitalName}>{h.name}</Text>
                  <Text style={styles.hospitalAddress} numberOfLines={1}>{h.address}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Specialty</Text>
            <View style={styles.specialtyRow}>
              {SPECIALTIES.map(s => (
                <TouchableOpacity
                  key={s.value}
                  style={[styles.specialtyChip, specialty === s.value && styles.specialtyChipActive]}
                  onPress={() => setSpecialty(s.value)}
                >
                  <Text style={[styles.specialtyText, specialty === s.value && styles.specialtyTextActive]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Hassan Ali"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
          returnKeyType="next"
        />

        <Text style={styles.label}>Phone (for SMS alerts)</Text>
        <TextInput
          style={styles.input}
          placeholder="+923001234567"
          placeholderTextColor={colors.textMuted}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          returnKeyType="next"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="next"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Min. 6 characters"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={handleSignup}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={loading || (role === 'doctor' && (!selectedHospitalId || !specialty))}
        >
          {loading
            ? <ActivityIndicator color={colors.white} />
            : <Text style={styles.buttonText}>Create Account</Text>
          }
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href={"/(auth)/login" as any} asChild>
            <TouchableOpacity>
              <Text style={styles.link}>Sign in</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  bgDecor: { ...StyleSheet.absoluteFillObject },
  orbOne: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.16)',
    top: -80,
    left: -40,
  },
  orbTwo: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: 80,
    right: -50,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  kicker: { fontSize: 12, letterSpacing: 2, color: 'rgba(255,255,255,0.7)', fontWeight: '700' },
  logo: { fontSize: 34, fontWeight: '800', color: colors.white, letterSpacing: -1, marginTop: 8 },
  tagline: { fontSize: font.sm, color: 'rgba(255,255,255,0.8)', marginTop: spacing.xs, maxWidth: 260 },
  form: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  formContent: { padding: spacing.lg, paddingBottom: 48 },
  title: { fontSize: font.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  label: { fontSize: font.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, marginTop: spacing.sm },
  roleRow: { flexDirection: 'row', gap: spacing.sm },
  roleChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  roleChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleChipText: { fontSize: font.sm, fontWeight: '700', color: colors.textSecondary },
  roleChipTextActive: { color: colors.white },
  staffBlock: {
    marginTop: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  staffTitle: { fontSize: font.base, fontWeight: '700', color: colors.text },
  staffHint: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  hospitalList: { gap: spacing.sm, marginTop: spacing.sm },
  hospitalCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hospitalCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  hospitalName: { fontSize: font.sm, fontWeight: '700', color: colors.text },
  hospitalAddress: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  specialtyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.xs },
  specialtyChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  specialtyChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  specialtyText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  specialtyTextActive: { color: colors.primary },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: font.base,
    color: colors.text,
    backgroundColor: colors.background,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.white, fontSize: font.base, fontWeight: '700' },
  errorBox: { backgroundColor: colors.redBg, borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.sm },
  errorText: { color: colors.red, fontSize: font.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.md },
  footerText: { color: colors.textSecondary, fontSize: font.sm },
  link: { color: colors.primary, fontSize: font.sm, fontWeight: '600' },
})
