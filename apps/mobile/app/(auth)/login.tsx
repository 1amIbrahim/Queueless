import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { Link } from 'expo-router'
import { useAuthStore } from '../../store/authStore'
import { colors, spacing, radius, font, shadow } from '../../constants/theme'

export default function LoginScreen() {
  const { signIn, loading, error, clearError } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async () => {
    if (!email.trim() || !password) return
    clearError()
    await signIn(email.trim().toLowerCase(), password)
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

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.kicker}>WELCOME BACK</Text>
        <Text style={styles.logo}>QueueLess</Text>
        <Text style={styles.tagline}>Your live queue pass, always in sync.</Text>
      </View>

      {/* Form */}
      <View style={[styles.form, shadow.card]}>
        <Text style={styles.title}>Sign in to continue</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

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
          placeholder="••••••••"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={colors.white} />
            : <Text style={styles.buttonText}>Sign In</Text>
          }
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href={"/(auth)/signup" as any} asChild>
            <TouchableOpacity>
              <Text style={styles.link}>Sign up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary, justifyContent: 'flex-end' },
  bgDecor: { ...StyleSheet.absoluteFillObject },
  orbOne: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.18)',
    top: -60,
    right: -40,
  },
  orbTwo: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.12)',
    bottom: 140,
    left: -50,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: 60,
  },
  kicker: { fontSize: 12, letterSpacing: 2, color: 'rgba(255,255,255,0.7)', fontWeight: '700' },
  logo: { fontSize: 38, fontWeight: '800', color: colors.white, letterSpacing: -1, marginTop: 8 },
  tagline: { fontSize: font.sm, color: 'rgba(255,255,255,0.8)', marginTop: spacing.xs, maxWidth: 260 },
  form: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.lg,
    paddingBottom: 40,
  },
  title: { fontSize: font.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  label: { fontSize: font.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, marginTop: spacing.sm },
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
  errorBox: {
    backgroundColor: colors.redBg,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorText: { color: colors.red, fontSize: font.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.md },
  footerText: { color: colors.textSecondary, fontSize: font.sm },
  link: { color: colors.primary, fontSize: font.sm, fontWeight: '600' },
})
