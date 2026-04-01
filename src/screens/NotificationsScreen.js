/**
 * NotificationsScreen – préférences de notifications
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenHeader  from '../components/ScreenHeader';
import SettingsRow   from '../components/SettingsRow';
import ToggleSwitch  from '../components/ToggleSwitch';
import { useTheme } from '../context/ThemeContext';

const NOTIF_KEY = '@dive_v2_notif_settings';

const DEFAULT_SETTINGS = {
  pushEnabled:      true,
  newSpots:         true,
  nearbySpots:      false,
  weatherAlerts:    true,
  weeklyDigest:     false,
  seasonalTips:     true,
};

const MOCK_NOTIFS = [
  { id: 1, icon: '🌊', title: 'Nouveau spot ajouté', body: 'Grotte Cosquer — Cassis',            time: 'Il y a 2h',  color: '#00E5FF' },
  { id: 2, icon: '☀️', title: 'Météo idéale demain',  body: 'Conditions parfaites à Marseille',  time: 'Il y a 5h',  color: '#FFB020' },
  { id: 3, icon: '⭐', title: 'Résumé hebdomadaire',  body: '3 nouveaux spots près de vous',     time: 'Hier',       color: '#7B61FF' },
];

const NotificationsScreen = ({ onBack }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    AsyncStorage.getItem(NOTIF_KEY)
      .then(raw => { if (raw) setSettings(JSON.parse(raw)); })
      .catch(() => {});
  }, []);

  const toggle = useCallback((key) => {
    setSettings(prev => {
      const next = { ...prev, [key]: !prev[key] };
      AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const Toggle = ({ k, color }) => (
    <ToggleSwitch
      value={settings[k]}
      onValueChange={() => toggle(k)}
      color={color || colors.primary}
      disabled={k !== 'pushEnabled' && !settings.pushEnabled}
    />
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Notifications" onBack={onBack} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>

        {/* ── Master toggle ── */}
        <Text style={styles.sectionLabel}>Général</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="◈" iconColor={colors.primary}
            label="Activer les notifications"
            subtitle="Recevoir des alertes et mises à jour"
            rightSlot={<Toggle k="pushEnabled" />}
            showBorder={false}
          />
        </View>

        {/* ── Types ── */}
        <Text style={styles.sectionLabel}>Types d'alertes</Text>
        <View style={styles.card}>
          <SettingsRow
            icon="🌊" iconColor={colors.primary}
            label="Nouveaux spots"
            subtitle="Quand un spot est ajouté"
            rightSlot={<Toggle k="newSpots" />}
          />
          <SettingsRow
            icon="📍" iconColor={colors.secondary}
            label="Spots à proximité"
            subtitle="Dans un rayon de 50km"
            rightSlot={<Toggle k="nearbySpots" color={colors.secondary} />}
          />
          <SettingsRow
            icon="☀️" iconColor={colors.amber}
            label="Alertes météo"
            subtitle="Conditions de plongée optimales"
            rightSlot={<Toggle k="weatherAlerts" color={colors.amber} />}
          />
          <SettingsRow
            icon="📅" iconColor={colors.emerald}
            label="Résumé hebdomadaire"
            subtitle="Récap chaque lundi matin"
            rightSlot={<Toggle k="weeklyDigest" color={colors.emerald} />}
          />
          <SettingsRow
            icon="🌿" iconColor={colors.accent}
            label="Conseils saisonniers"
            subtitle="Meilleure saison pour chaque spot"
            rightSlot={<Toggle k="seasonalTips" color={colors.accent} />}
            showBorder={false}
          />
        </View>

        {/* ── Historique ── */}
        <Text style={styles.sectionLabel}>Récentes</Text>
        <View style={styles.card}>
          {MOCK_NOTIFS.map((n, i) => (
            <View key={n.id} style={[styles.notifItem, i === MOCK_NOTIFS.length - 1 && styles.notifItemLast]}>
              <View style={[styles.notifIconWrap, { backgroundColor: n.color + '18' }]}>
                <Text style={styles.notifEmoji}>{n.icon}</Text>
              </View>
              <View style={styles.notifBody}>
                <Text style={styles.notifTitle}>{n.title}</Text>
                <Text style={styles.notifText}>{n.body}</Text>
              </View>
              <Text style={styles.notifTime}>{n.time}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
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

  notifItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 13, gap: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  notifItemLast:  { borderBottomWidth: 0 },
  notifIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  notifEmoji:  { fontSize: 18 },
  notifBody:   { flex: 1, gap: 2 },
  notifTitle:  { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  notifText:   { fontSize: 12, color: colors.textMuted },
  notifTime:   { fontSize: 11, color: colors.textMuted, letterSpacing: 0.2 },
});

export default NotificationsScreen;
