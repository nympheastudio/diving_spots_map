/**
 * ListView 2026 – Cards immersives Ocean Deep
 */

import React, { useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { orderByDistance } from 'geolib';
import { useTheme } from '../context/ThemeContext';
import { radius, shadows } from '../theme';

const ListView = ({ spots = [], userLocation = null, onSpotPress }) => {
  const { colors, difficultyMeta } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const sortedSpots = useMemo(() => {
    if (!spots?.length) return [];
    if (userLocation?.latitude && userLocation?.longitude) {
      const valid = spots.filter(s => s?.latitude && s?.longitude);
      return orderByDistance(userLocation, valid);
    }
    return spots;
  }, [spots, userLocation]);

  const renderSpotItem = useCallback(({ item }) => {
    const diff = difficultyMeta[item.difficulte] || difficultyMeta.Intermediate;
    let distanceText = '';
    if (userLocation?.latitude && item.distance) {
      distanceText = `${(item.distance / 1000).toFixed(1)} km`;
    }

    return (
      <TouchableOpacity style={styles.card} onPress={() => onSpotPress?.(item)} activeOpacity={0.85}>
        <Image source={{ uri: item.photo }} style={styles.cardImage} resizeMode="cover" />
        <View style={styles.cardOverlay} />

        <View style={[styles.diffPill, { backgroundColor: diff.bg }]}>
          <View style={[styles.diffDot, { backgroundColor: diff.color }]} />
          <Text style={[styles.diffText, { color: diff.color }]}>{diff.label}</Text>
        </View>

        {distanceText !== '' && (
          <View style={styles.distanceBadge}>
            <Text style={styles.distanceText}>{distanceText}</Text>
          </View>
        )}

        <View style={styles.cardBottom}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.nom}</Text>
          <Text style={styles.cardLocation}>📍 {item.localite}</Text>
          <View style={styles.metricsRow}>
            <MetricPill icon="↕" value={`${item.profondeur_min}–${item.profondeur_max}m`} />
            <MetricPill icon="👁" value={`${item.visibilite}m`} />
            <MetricPill icon="⚓" value={item.type_site} />
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [userLocation, onSpotPress, styles, difficultyMeta]);

  if (!sortedSpots.length) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>🤿</Text>
        <Text style={styles.emptyTitle}>Aucun spot trouvé</Text>
        <Text style={styles.emptySub}>Ajustez vos filtres</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sortedSpots}
        renderItem={renderSpotItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        windowSize={7}
      />
    </View>
  );
};

const MetricPill = React.memo(({ icon, value }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.metricPill}>
      <Text style={styles.metricIcon}>{icon}</Text>
      <Text style={styles.metricVal} numberOfLines={1}>{value}</Text>
    </View>
  );
});

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: {
    paddingTop: 72,
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 14,
  },

  card: {
    borderRadius: radius.lg, overflow: 'hidden',
    backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.border,
    ...shadows.card,
  },
  cardImage: { width: '100%', height: 180, backgroundColor: colors.bgElevated },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    top: 0, height: 180,
    backgroundColor: 'transparent',
  },

  diffPill: {
    position: 'absolute', top: 12, left: 12,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill,
  },
  diffDot: { width: 6, height: 6, borderRadius: 3 },
  diffText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  distanceBadge: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: colors.bgGlass,
    borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: colors.borderMid,
  },
  distanceText: { fontSize: 11, fontWeight: '700', color: colors.primary },

  cardBottom: { padding: 14, gap: 4 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, letterSpacing: 0.1 },
  cardLocation: { fontSize: 12, color: colors.textSecondary, marginBottom: 8 },

  metricsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  metricPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.bgGlassLight, borderRadius: radius.pill,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: colors.border,
  },
  metricIcon: { fontSize: 11, color: colors.primary },
  metricVal: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, maxWidth: 90 },

  emptyState: {
    flex: 1, backgroundColor: colors.bg,
    justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  emptyIcon:  { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  emptySub:   { fontSize: 14, color: colors.textMuted },
});

ListView.propTypes = {
  spots: PropTypes.array,
  userLocation: PropTypes.object,
  onSpotPress: PropTypes.func,
};

export default ListView;
