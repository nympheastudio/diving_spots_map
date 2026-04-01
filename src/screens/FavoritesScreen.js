/**
 * FavoritesScreen – spots sauvegardés
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Image, Animated, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenHeader  from '../components/ScreenHeader';
import DivingDataService from '../services/DivingDataService';
import { useTheme } from '../context/ThemeContext';
import { radius, shadows } from '../theme';

export const FAVORITES_KEY = '@dive_v2_favorites';

export const toggleFavorite = async (spotId) => {
  try {
    const raw = await AsyncStorage.getItem(FAVORITES_KEY);
    const ids  = raw ? JSON.parse(raw) : [];
    const next = ids.includes(spotId) ? ids.filter(i => i !== spotId) : [...ids, spotId];
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    return next.includes(spotId);
  } catch { return false; }
};

export const isFavorite = async (spotId) => {
  try {
    const raw = await AsyncStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw).includes(spotId) : false;
  } catch { return false; }
};

// ── EmptyState ────────────────────────────────────────────────────────────
const EmptyState = () => {
  const { colors } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 }}>
      <Animated.Text style={{ fontSize: 64, color: colors.amber, transform: [{ scale: pulseAnim }] }}>
        ★
      </Animated.Text>
      <Text style={{ fontSize: 20, fontWeight: '700', color: colors.textPrimary }}>Aucun favori</Text>
      <Text style={{ fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22 }}>
        {'Explorez la carte et appuyez sur\nl\'étoile pour sauvegarder un spot'}
      </Text>
    </View>
  );
};

// ── SpotCard ──────────────────────────────────────────────────────────────
const SpotCard = ({ spot, onPress, onRemove }) => {
  const { colors, difficultyMeta } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const diff = difficultyMeta[spot.difficulte] || difficultyMeta.Intermediate;

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress?.(spot)} activeOpacity={0.85}>
      <Image source={{ uri: spot.photo }} style={styles.cardImage} resizeMode="cover" />

      <View style={[styles.diffPill, { backgroundColor: diff.bg }]}>
        <View style={[styles.diffDot, { backgroundColor: diff.color }]} />
        <Text style={[styles.diffText, { color: diff.color }]}>{diff.label}</Text>
      </View>

      <TouchableOpacity style={styles.removeBtn} onPress={() => onRemove(spot.id)}>
        <Text style={styles.removeIcon}>✕</Text>
      </TouchableOpacity>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{spot.nom}</Text>
        <Text style={styles.cardLoc}>📍 {spot.localite}</Text>
        <View style={styles.metricsRow}>
          <MetricPill label={`${spot.profondeur_min}–${spot.profondeur_max}m`} />
          <MetricPill label={`👁 ${spot.visibilite}m`} />
          <MetricPill label={spot.type_site} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const MetricPill = ({ label }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.metricPill}>
      <Text style={styles.metricText} numberOfLines={1}>{label}</Text>
    </View>
  );
};

// ── FavoritesScreen ───────────────────────────────────────────────────────
const FavoritesScreen = ({ onBack }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [favorites, setFavorites] = useState([]);
  const [loading,   setLoading]   = useState(true);

  const loadFavorites = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(FAVORITES_KEY);
      const ids = raw ? JSON.parse(raw) : [];
      if (ids.length > 0) {
        const all = await DivingDataService.getAllDivingSpots();
        setFavorites(all.filter(s => ids.includes(s.id)));
      } else {
        setFavorites([]);
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadFavorites(); }, []);

  const handleRemove = useCallback((spotId) => {
    Alert.alert('Retirer des favoris', 'Supprimer ce spot de vos favoris ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer', style: 'destructive',
        onPress: async () => {
          await toggleFavorite(spotId);
          setFavorites(prev => prev.filter(s => s.id !== spotId));
        },
      },
    ]);
  }, []);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Mes Favoris"
        onBack={onBack}
        rightAction={
          favorites.length > 0
            ? { icon: '↺', onPress: loadFavorites }
            : undefined
        }
      />

      {!loading && favorites.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <SpotCard spot={item} onRemove={handleRemove} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}
    </View>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list:      { padding: 16, paddingBottom: 48 },

  card: {
    borderRadius: radius.lg, overflow: 'hidden',
    backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.border,
    ...shadows.card,
  },
  cardImage: { width: '100%', height: 160, backgroundColor: colors.bgElevated },

  diffPill: {
    position: 'absolute', top: 10, left: 10,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill,
  },
  diffDot:  { width: 6, height: 6, borderRadius: 3 },
  diffText: { fontSize: 11, fontWeight: '700' },

  removeBtn: {
    position: 'absolute', top: 10, right: 10,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(5,10,16,0.65)',
    borderWidth: 1, borderColor: colors.borderMid,
    alignItems: 'center', justifyContent: 'center',
  },
  removeIcon: { fontSize: 11, color: colors.textSecondary, fontWeight: '700' },

  cardBody:  { padding: 14, gap: 4 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  cardLoc:   { fontSize: 12, color: colors.textSecondary, marginBottom: 6 },

  metricsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  metricPill: {
    backgroundColor: colors.bgGlassLight, borderRadius: radius.pill,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  metricText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
});

export default FavoritesScreen;
