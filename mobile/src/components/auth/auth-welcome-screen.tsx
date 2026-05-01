import React, { useRef, useState } from 'react';
import { View, Text, FlatList, Dimensions, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/typography';
import { Button } from '../primitives/Button';

const { width: SCREEN_W } = Dimensions.get('window');

const SLIDES = [
  { id: '1', title: 'Track your health', body: 'Monitor vitals, medications, and appointments all in one place.' },
  { id: '2', title: 'AI-powered insights', body: 'Get personalised recommendations backed by your health data.' },
  { id: '3', title: 'Care team access', body: 'Connect directly with your doctors and care team anytime.' },
];

export function AuthWelcomeScreen() {
  const t = useTheme();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  return (
    <View style={styles.root}>
      {/* Logo hero */}
      <View style={styles.logoArea}>
        <LinearGradient
          colors={[t.brand, t.accent ?? t.brandDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logoGlow}
        >
          <Text style={[typography.display, styles.logoText]}>H</Text>
        </LinearGradient>
        <Text style={[typography.topBarTitle, { color: t.ink, marginTop: 12 }]}>HealthOS</Text>
        <Text style={[typography.body, { color: t.ink3, marginTop: 4 }]}>Your personal health companion</Text>
      </View>

      {/* Carousel */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={(e) => {
          setIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W));
        }}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: SCREEN_W }]}>
            <Text style={[typography.title, { color: t.ink, textAlign: 'center' }]}>{item.title}</Text>
            <Text style={[typography.body, { color: t.ink3, textAlign: 'center', marginTop: 8 }]}>{item.body}</Text>
          </View>
        )}
        style={styles.carousel}
      />

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === index ? t.brand : t.border },
              i === index && styles.dotActive,
            ]}
          />
        ))}
      </View>

      {/* CTAs */}
      <View style={styles.ctas}>
        <Button label="Get started" size="lg" onPress={() => router.push('/auth/sign-up')} />
        <Pressable style={styles.ghostBtn} onPress={() => router.push('/auth/sign-in')}>
          <Text style={[typography.button, { color: t.ink }]}>I have an account</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1, alignItems: 'center', paddingTop: 20 },
  logoArea:   { alignItems: 'center', paddingHorizontal: 28, paddingTop: 24 },
  logoGlow:   { width: 96, height: 96, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
                shadowColor: '#0A6EFF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 30, elevation: 16 },
  logoText:   { color: '#FFFFFF', fontFamily: 'Inter_800ExtraBold', lineHeight: 96 },
  carousel:   { flexGrow: 0, marginTop: 28 },
  slide:      { paddingHorizontal: 32, paddingVertical: 12, alignItems: 'center' },
  dots:       { flexDirection: 'row', gap: 6, marginTop: 16 },
  dot:        { width: 6, height: 6, borderRadius: 3 },
  dotActive:  { width: 18 },
  ctas:       { width: '100%', paddingHorizontal: 28, gap: 12, marginTop: 32 },
  ghostBtn:   { height: 52, alignItems: 'center', justifyContent: 'center' },
});
