/**
 * AboutScreen – infos app, version, liens
 */

import React, { useEffect, useRef, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Linking, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../context/ThemeContext';
import { radius } from '../theme';

const FEATURES = [
  { icon: '◎', label: '200+ spots cartographiés en Méditerranée',   color: null },
  { icon: '⧉', label: 'Filtres avancés : niveau, profondeur, type', color: null },
  { icon: '📍', label: 'Géolocalisation et spots à proximité',       color: null },
  { icon: '★', label: 'Favoris et historique de plongées',          color: null },
  { icon: '🌊', label: 'Données faune, flore et conditions',        color: null },
];

const LINKS = [
  { icon: '🌐', label: 'Site web',                   url: 'https://diveexplorer.app' },
  { icon: '🔒', label: 'Politique de confidentialité', url: 'https://diveexplorer.app/privacy' },
  { icon: '📜', label: "Conditions d'utilisation",   url: 'https://diveexplorer.app/terms' },
  { icon: '📧', label: 'Contact & support',           url: 'mailto:hello@diveexplorer.app' },
];

const FEATURE_COLORS = ['primary', 'secondary', 'emerald', 'amber', 'accent'];

const AboutScreen = ({ onBack }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      <ScreenHeader title="À propos" onBack={onBack} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>

        {/* ── Hero logo ── */}
        <Animated.View style={[styles.heroSection, { opacity: fadeAnim }]}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <LinearGradient
              colors={colors.gradProfile}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.logoCircle}
            >
              <Text style={styles.logoIcon}>🤿</Text>
            </LinearGradient>
          </Animated.View>
          <Text style={styles.appName}>Dive Explorer</Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>Version 2.0.0</Text>
            <View style={styles.versionDot} />
            <Text style={styles.versionText}>Ocean Deep Edition</Text>
          </View>
          <Text style={styles.appDesc}>
            Explorez les plus beaux spots de plongée de la Méditerranée.
            Filtrez, naviguez et découvrez les fonds marins comme jamais.
          </Text>
        </Animated.View>

        {/* ── Features ── */}
        <Text style={styles.sectionLabel}>Fonctionnalités</Text>
        <View style={styles.card}>
          {FEATURES.map((f, i) => {
            const color = colors[FEATURE_COLORS[i]];
            return (
              <View key={i} style={[styles.featureRow, i === FEATURES.length - 1 && styles.featureRowLast]}>
                <View style={[styles.featureIcon, { backgroundColor: color + '18' }]}>
                  <Text style={[styles.featureEmoji, { color }]}>{f.icon}</Text>
                </View>
                <Text style={styles.featureLabel}>{f.label}</Text>
              </View>
            );
          })}
        </View>

        {/* ── Build info ── */}
        <Text style={styles.sectionLabel}>Informations</Text>
        <View style={styles.card}>
          <InfoRow label="Version"    value="2.0.0"              />
          <InfoRow label="Build"      value="2026.03"            />
          <InfoRow label="Plateforme" value="Expo SDK 52"        />
          <InfoRow label="Données"    value="Méditerranée · FR"  />
          <InfoRow label="Mise à jour" value="Mars 2026" isLast  />
        </View>

        {/* ── Liens ── */}
        <Text style={styles.sectionLabel}>Liens</Text>
        <View style={styles.card}>
          {LINKS.map((l, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.linkRow, i === LINKS.length - 1 && styles.linkRowLast]}
              onPress={() => Linking.openURL(l.url).catch(() => {})}
              activeOpacity={0.7}
            >
              <Text style={styles.linkEmoji}>{l.icon}</Text>
              <Text style={styles.linkLabel}>{l.label}</Text>
              <Text style={styles.linkArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerLine}>Fait avec 🤿 à Marseille</Text>
          <Text style={styles.footerSub}>© 2026 Dive Explorer · Tous droits réservés</Text>
          <Text style={styles.footerSub}>Données : OpenStreetMap · Wikimedia Commons</Text>
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
};

const InfoRow = ({ label, value, isLast }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.infoRow, isLast && styles.infoRowLast]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  body:      { paddingBottom: 40 },

  heroSection: {
    alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24, gap: 12,
  },
  logoCircle: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55, shadowRadius: 20, elevation: 16,
  },
  logoIcon: { fontSize: 42 },
  appName: {
    fontSize: 26, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.3,
  },
  versionBadge: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  versionText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  versionDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primaryMid },
  appDesc: {
    fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22,
  },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    letterSpacing: 1.1, textTransform: 'uppercase',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8,
  },

  card: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },

  featureRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 13, gap: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  featureRowLast: { borderBottomWidth: 0 },
  featureIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  featureEmoji: { fontSize: 18 },
  featureLabel: { flex: 1, fontSize: 14, color: colors.textSecondary, lineHeight: 20 },

  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  infoRowLast: { borderBottomWidth: 0 },
  infoLabel: { fontSize: 14, color: colors.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },

  linkRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, gap: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  linkRowLast: { borderBottomWidth: 0 },
  linkEmoji: { fontSize: 18, width: 24, textAlign: 'center' },
  linkLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.primary },
  linkArrow: { fontSize: 20, color: colors.textMuted, fontWeight: '300' },

  footer: { alignItems: 'center', paddingTop: 32, paddingHorizontal: 24, gap: 6 },
  footerLine: { fontSize: 15, color: colors.textSecondary, fontWeight: '600' },
  footerSub:  { fontSize: 11, color: colors.textMuted, textAlign: 'center', letterSpacing: 0.2 },
});

export default AboutScreen;
