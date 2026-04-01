/**
 * OnboardingScreen 2026 – Premium animated onboarding
 * Avant-garde: pulse rings, slide transitions, gradient backgrounds
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
  StatusBar,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radius } from '../theme';

const { width: SW, height: SH } = Dimensions.get('window');

export const ONBOARDING_KEY = '@dive_v2_onboarding_done';

export const checkOnboardingDone = async () => {
  try { return (await AsyncStorage.getItem(ONBOARDING_KEY)) === 'true'; }
  catch { return false; }
};

const SLIDES = [
  {
    key: 'welcome',
    icon: '🌊',
    title: 'Bienvenue dans\nDive Explorer',
    subtitle: 'Découvrez les spots de plongée\nles plus épiques de Méditerranée',
    gradColors: ['#050A10', '#081828', '#0A2035'],
    accent: '#00E5FF',
  },
  {
    key: 'map',
    icon: '◎',
    title: '200+ Spots\nCartographiés',
    subtitle: 'Naviguez sur une carte interactive\net explorez les fonds marins en HD',
    gradColors: ['#050A10', '#090F28', '#0B1440'],
    accent: '#7B61FF',
  },
  {
    key: 'filter',
    icon: '⧉',
    title: 'Filtrez\nSelon Votre Niveau',
    subtitle: 'Débutant, intermédiaire ou expert —\ntrouvez exactement votre spot',
    gradColors: ['#050A10', '#081520', '#091E2C'],
    accent: '#00E5A0',
  },
  {
    key: 'ready',
    icon: '🤿',
    title: 'Prêt à\nExplorer ?',
    subtitle: 'Activez votre GPS pour découvrir\nles spots les plus proches de vous',
    gradColors: ['#050A10', '#0A0D18', '#0C1020'],
    accent: '#FF4757',
  },
];

// ── PulseRing ─────────────────────────────────────────────────────────────
const PulseRing = ({ color, delay, size }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 2400, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute',
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth: 1.5,
      borderColor: color,
      opacity: anim.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 0.7, 0.3, 0] }),
      transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.5] }) }],
    }} />
  );
};

// ── SlideContent ──────────────────────────────────────────────────────────
const SlideContent = ({ slide, isActive }) => {
  const iconAnim     = useRef(new Animated.Value(0)).current;
  const titleAnim    = useRef(new Animated.Value(0)).current;
  const subtitleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isActive) return;
    iconAnim.setValue(0);
    titleAnim.setValue(0);
    subtitleAnim.setValue(0);

    Animated.sequence([
      Animated.spring(iconAnim, { toValue: 1, tension: 55, friction: 8, useNativeDriver: true }),
      Animated.stagger(100, [
        Animated.spring(titleAnim,    { toValue: 1, tension: 50, friction: 10, useNativeDriver: true }),
        Animated.spring(subtitleAnim, { toValue: 1, tension: 50, friction: 10, useNativeDriver: true }),
      ]),
    ]).start();
  }, [isActive]);

  return (
    <View style={[styles.slide, { width: SW }]}>
      {/* Icon with pulse rings */}
      <Animated.View style={[styles.iconWrap, {
        opacity: iconAnim,
        transform: [{ scale: iconAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
      }]}>
        <PulseRing color={slide.accent} delay={0}    size={210} />
        <PulseRing color={slide.accent} delay={750}  size={165} />
        <PulseRing color={slide.accent} delay={1400} size={120} />
        <View style={[styles.iconCircle, {
          backgroundColor: slide.accent + '18',
          borderColor:     slide.accent + '40',
          shadowColor:     slide.accent,
        }]}>
          <Text style={styles.iconText}>{slide.icon}</Text>
        </View>
      </Animated.View>

      {/* Title */}
      <Animated.Text style={[styles.slideTitle, {
        opacity: titleAnim,
        transform: [{ translateY: titleAnim.interpolate({ inputRange: [0, 1], outputRange: [32, 0] }) }],
      }]}>
        {slide.title}
      </Animated.Text>

      {/* Subtitle */}
      <Animated.Text style={[styles.slideSub, {
        opacity: subtitleAnim,
        transform: [{ translateY: subtitleAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
      }]}>
        {slide.subtitle}
      </Animated.Text>
    </View>
  );
};

// ── DotIndicator ──────────────────────────────────────────────────────────
const DotIndicator = ({ active, color }) => {
  const widthAnim = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(widthAnim, {
      toValue: active ? 1 : 0,
      tension: 60, friction: 10,
      useNativeDriver: false,
    }).start();
  }, [active]);

  return (
    <Animated.View style={[styles.dot, {
      backgroundColor: color,
      width:   widthAnim.interpolate({ inputRange: [0, 1], outputRange: [7, 26] }),
      opacity: widthAnim.interpolate({ inputRange: [0, 1], outputRange: [0.32, 1] }),
    }]} />
  );
};

// ── OnboardingScreen ──────────────────────────────────────────────────────
const OnboardingScreen = ({ onDone }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef(null);

  const handleScroll = useCallback((e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SW);
    setCurrentIndex(Math.max(0, Math.min(idx, SLIDES.length - 1)));
  }, []);

  const goNext = useCallback(() => {
    if (currentIndex < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (currentIndex + 1) * SW, animated: true });
    } else {
      finish();
    }
  }, [currentIndex]);

  const finish = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true').catch(() => {});
    onDone?.();
  }, [onDone]);

  const slide  = SLIDES[currentIndex];
  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Dynamic background */}
      <LinearGradient colors={slide.gradColors} style={StyleSheet.absoluteFillObject} />

      {/* Subtle grain texture overlay */}
      <View style={styles.grainOverlay} />

      {/* Skip button */}
      {!isLast && (
        <TouchableOpacity style={styles.skipBtn} onPress={finish} activeOpacity={0.75}>
          <Text style={styles.skipText}>Passer</Text>
        </TouchableOpacity>
      )}

      {/* Slide counter top-left */}
      <View style={styles.slideCounter}>
        <Text style={styles.slideCounterText}>{currentIndex + 1}/{SLIDES.length}</Text>
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
        bounces={false}
      >
        {SLIDES.map((s, i) => (
          <SlideContent key={s.key} slide={s} isActive={i === currentIndex} />
        ))}
      </ScrollView>

      {/* Bottom section */}
      <View style={styles.bottomSection}>
        {/* Page dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((s, i) => (
            <DotIndicator key={s.key} active={i === currentIndex} color={slide.accent} />
          ))}
        </View>

        {/* CTA Button */}
        <TouchableOpacity onPress={goNext} activeOpacity={0.88} style={styles.ctaBtnWrap}>
          <LinearGradient
            colors={isLast
              ? [slide.accent, slide.accent + 'CC']
              : [colors.primary, '#0088FF']
            }
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.ctaBtn}
          >
            <Text style={styles.ctaBtnText}>
              {isLast ? "Commencer l'aventure  🚀" : 'Suivant  →'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Bottom hint */}
        {!isLast && (
          <TouchableOpacity onPress={finish}>
            <Text style={styles.hintText}>Déjà un compte ? Se connecter</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050A10',
  },
  scrollView: {
    flex: 1,
  },
  grainOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    opacity: 0.025,
  },

  // ── Slide ──
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingBottom: 20,
  },
  iconWrap: {
    width: 230,
    height: 230,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 52,
  },
  iconCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 24,
    elevation: 14,
  },
  iconText: {
    fontSize: 46,
  },
  slideTitle: {
    fontSize: 38,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.6,
    lineHeight: 46,
    marginBottom: 18,
  },
  slideSub: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 25,
    letterSpacing: 0.1,
  },

  // ── Skip / Counter ──
  skipBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 58 : 38,
    right: 24,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  skipText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  slideCounter: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 62 : 42,
    left: 24,
    zIndex: 10,
  },
  slideCounterText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // ── Bottom ──
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 52 : 36,
    paddingTop: 20,
    alignItems: 'center',
    gap: 18,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
  ctaBtnWrap: {
    width: SW - 48,
  },
  ctaBtn: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: radius.xl,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 14,
  },
  ctaBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
  },
  hintText: {
    fontSize: 13,
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
});

export default OnboardingScreen;
