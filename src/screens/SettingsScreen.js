/**
 * SettingsScreen – paramètres de l'app + sélecteur de thème
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenHeader from '../components/ScreenHeader';
import SettingsRow  from '../components/SettingsRow';
import ToggleSwitch from '../components/ToggleSwitch';
import { useTheme } from '../context/ThemeContext';
import { radius } from '../theme';

const SETTINGS_KEY = '@dive_v2_app_settings';

const DEFAULT_SETTINGS = {
  units:           'metric',
  temperature:     'celsius',
  language:        'fr',
  mapClusters:     true,
  depthLabels:     true,
  shareLocation:   true,
  analytics:       false,
};

// ── SegmentedControl ──────────────────────────────────────────────────────
const SegmentedControl = ({ options, value, onChange, colorActive }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const active = colorActive || colors.primary;

  return (
    <View style={styles.segmented}>
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.segBtn,
              isActive && { backgroundColor: active + '22', borderColor: active },
            ]}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.75}
          >
            <Text style={[
              styles.segLabel,
              isActive && { color: active, fontWeight: '700' },
            ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const SettingsScreen = ({ onBack }) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY)
      .then(raw => { if (raw) setSettings(JSON.parse(raw)); })
      .catch(() => {});
  }, []);

  const update = useCallback((key, value) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const Toggle = ({ k, color }) => (
    <ToggleSwitch value={settings[k]} onValueChange={(v) => update(k, v)} color={color || colors.primary} />
  );

  const handleClearCache = () => Alert.alert(
    'Vider le cache',
    'Les données téléchargées seront supprimées.',
    [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Vider', style: 'destructive', onPress: () => {} },
    ]
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Paramètres" onBack={onBack} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>

        {/* ── Apparence / Thème ── */}
        <SectionLabel>Apparence</SectionLabel>
        <View style={styles.card}>
          <View style={[styles.segRow, styles.segRowLast]}>
            <View style={styles.segTextWrap}>
              <Text style={styles.segTitle}>Thème de l'interface</Text>
              <Text style={styles.segSub}>{isDark ? 'Mode sombre' : 'Mode clair'}</Text>
            </View>
            <View style={styles.themeToggleWrap}>
              <TouchableOpacity
                style={[styles.themeBtn, !isDark && styles.themeBtnActive]}
                onPress={() => isDark && toggleTheme()}
                activeOpacity={0.8}
              >
                <Text style={styles.themeBtnIcon}>☀️</Text>
                <Text style={[styles.themeBtnLabel, !isDark && { color: colors.amber, fontWeight: '700' }]}>Clair</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.themeBtn, isDark && styles.themeBtnActive]}
                onPress={() => !isDark && toggleTheme()}
                activeOpacity={0.8}
              >
                <Text style={styles.themeBtnIcon}>🌙</Text>
                <Text style={[styles.themeBtnLabel, isDark && { color: colors.secondary, fontWeight: '700' }]}>Sombre</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Mesures ── */}
        <SectionLabel>Mesures</SectionLabel>
        <View style={styles.card}>
          <View style={styles.segRow}>
            <View style={styles.segTextWrap}>
              <Text style={styles.segTitle}>Unités de distance</Text>
              <Text style={styles.segSub}>Profondeur et visibilité</Text>
            </View>
            <SegmentedControl
              value={settings.units}
              onChange={(v) => update('units', v)}
              options={[{ label: 'm', value: 'metric' }, { label: 'ft', value: 'imperial' }]}
            />
          </View>
          <View style={[styles.segRow, styles.segRowLast]}>
            <View style={styles.segTextWrap}>
              <Text style={styles.segTitle}>Température</Text>
              <Text style={styles.segSub}>Eau et air</Text>
            </View>
            <SegmentedControl
              value={settings.temperature}
              onChange={(v) => update('temperature', v)}
              options={[{ label: '°C', value: 'celsius' }, { label: '°F', value: 'fahrenheit' }]}
              colorActive={colors.amber}
            />
          </View>
        </View>

        {/* ── Langue ── */}
        <SectionLabel>Langue</SectionLabel>
        <View style={styles.card}>
          <View style={[styles.segRow, styles.segRowLast]}>
            <View style={styles.segTextWrap}>
              <Text style={styles.segTitle}>Langue de l'interface</Text>
              <Text style={styles.segSub}>Textes et notifications</Text>
            </View>
            <SegmentedControl
              value={settings.language}
              onChange={(v) => update('language', v)}
              options={[{ label: 'FR', value: 'fr' }, { label: 'EN', value: 'en' }]}
              colorActive={colors.secondary}
            />
          </View>
        </View>

        {/* ── Carte ── */}
        <SectionLabel>Carte</SectionLabel>
        <View style={styles.card}>
          <SettingsRow
            icon="◎" iconColor={colors.primary}
            label="Regrouper les marqueurs"
            subtitle="Clustering automatique"
            rightSlot={<Toggle k="mapClusters" />}
          />
          <SettingsRow
            icon="↕" iconColor={colors.emerald}
            label="Étiquettes de profondeur"
            subtitle="Afficher sur les marqueurs"
            rightSlot={<Toggle k="depthLabels" color={colors.emerald} />}
            showBorder={false}
          />
        </View>

        {/* ── Confidentialité ── */}
        <SectionLabel>Confidentialité</SectionLabel>
        <View style={styles.card}>
          <SettingsRow
            icon="📍" iconColor={colors.secondary}
            label="Partager ma position"
            subtitle="Pour les suggestions de proximité"
            rightSlot={<Toggle k="shareLocation" color={colors.secondary} />}
          />
          <SettingsRow
            icon="◧" iconColor={colors.textMuted}
            label="Statistiques d'utilisation"
            subtitle="Aide à améliorer l'app"
            rightSlot={<Toggle k="analytics" color={colors.textMuted} />}
            showBorder={false}
          />
        </View>

        {/* ── Données ── */}
        <SectionLabel>Données</SectionLabel>
        <View style={styles.card}>
          <SettingsRow
            icon="🗑" label="Vider le cache"
            subtitle="Libère de l'espace stockage"
            onPress={handleClearCache}
            danger
            showBorder={false}
          />
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
};

const SectionLabel = ({ children }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return <Text style={styles.sectionLabel}>{children}</Text>;
};

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  body:      { paddingBottom: 40 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    letterSpacing: 1.1, textTransform: 'uppercase',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8,
  },

  card: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },

  // Theme toggle
  themeToggleWrap: {
    flexDirection: 'row',
    gap: 6,
  },
  themeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    minWidth: 58,
  },
  themeBtnActive: {
    borderColor: colors.primaryMid,
    backgroundColor: colors.primaryDim,
  },
  themeBtnIcon: { fontSize: 18 },
  themeBtnLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 0.2,
  },

  // Segmented rows
  segRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.bgCard, gap: 12,
  },
  segRowLast: { borderBottomWidth: 0 },
  segTextWrap: { flex: 1, gap: 2 },
  segTitle: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  segSub:   { fontSize: 12, color: colors.textMuted },

  // SegmentedControl
  segmented: { flexDirection: 'row', gap: 4 },
  segBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.bgElevated,
  },
  segLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
});

export default SettingsScreen;
