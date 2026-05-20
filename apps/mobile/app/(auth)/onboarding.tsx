import { useState, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView, SafeAreaView,
} from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { colors, spacing, font, radius } from '../../constants/theme'

const { width } = Dimensions.get('window')

const SLIDES = [
  {
    icon: '🏥',
    title: 'Find the\nShortest Queue',
    body: 'See live wait times across every nearby hospital before you leave home. Always go to the right place.',
    bg: '#2563eb',
  },
  {
    icon: '🎫',
    title: 'Book or\nWalk In',
    body: 'Join a queue from your phone, or walk into any hospital — the receptionist issues your token and you\'re in the system.',
    bg: '#0d9488',
  },
  {
    icon: '🔔',
    title: 'Get Notified\nWhen You\'re Close',
    body: 'Receive an SMS or WhatsApp alert when you\'re 2–3 patients away. No need to wait in the room.',
    bg: '#7c3aed',
  },
]

export default function OnboardingScreen() {
  const router = useRouter()
  const scrollRef = useRef<ScrollView>(null)
  const [current, setCurrent] = useState(0)

  const goNext = () => {
    if (current < SLIDES.length - 1) {
      const next = current + 1
      scrollRef.current?.scrollTo({ x: next * width, animated: true })
      setCurrent(next)
    } else {
      finish()
    }
  }

  const finish = async () => {
    await AsyncStorage.setItem('queueless_onboarded', 'true')
    router.replace('/(auth)/login')
  }

  const slide = SLIDES[current]

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: slide.bg }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={styles.scroller}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={[styles.slide, { width, backgroundColor: s.bg }]}>
            <View style={styles.iconWrap}>
              <Text style={styles.icon}>{s.icon}</Text>
            </View>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.body}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Bottom section */}
      <View style={styles.bottom}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === current && styles.dotActive]}
            />
          ))}
        </View>

        {/* Next / Get Started */}
        <TouchableOpacity style={styles.nextBtn} onPress={goNext}>
          <Text style={styles.nextBtnText}>
            {current === SLIDES.length - 1 ? 'Get Started' : 'Next →'}
          </Text>
        </TouchableOpacity>

        {/* Skip */}
        {current < SLIDES.length - 1 && (
          <TouchableOpacity onPress={finish} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroller: { flex: 1 },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 60,
    paddingBottom: 20,
  },
  iconWrap: {
    width: 120, height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.xl,
  },
  icon: { fontSize: 56 },
  title: {
    fontSize: 36, fontWeight: '800', color: colors.white,
    textAlign: 'center', lineHeight: 42, marginBottom: spacing.md,
  },
  body: {
    fontSize: font.base, color: 'rgba(255,255,255,0.8)',
    textAlign: 'center', lineHeight: 24, maxWidth: 300,
  },
  bottom: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
    paddingTop: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  dots: { flexDirection: 'row', gap: 6, marginBottom: spacing.sm },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: { width: 24, backgroundColor: colors.white },
  nextBtn: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextBtnText: { fontSize: font.base, fontWeight: '800', color: colors.primary },
  skipBtn: { paddingVertical: 8 },
  skipText: { color: 'rgba(255,255,255,0.6)', fontSize: font.sm },
})
