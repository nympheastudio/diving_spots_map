/**
 * ARScreen – Réalité augmentée pour visualiser les spots de plongée
 * Affiche la caméra en fond et overlay les spots selon l'orientation du téléphone
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Magnetometer, DeviceMotion } from 'expo-sensors';
import * as Location from 'expo-location';
import { getDistance } from 'geolib';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const H_FOV = 60; // horizontal field of view (degrees)
const V_FOV = 90; // vertical field of view (degrees)
const MAX_DISTANCE_M = 50000; // 50 km max distance to show spots

// ── Helpers ─────────────────────────────────────────────────────────────

/**
 * Calcul du bearing (azimut) entre deux points GPS en degrés
 */
function getBearing(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Normalise un angle entre -180 et +180
 */
function normalizeAngle(angle) {
  let a = angle % 360;
  if (a > 180) a -= 360;
  if (a < -180) a += 360;
  return a;
}

/**
 * Format distance en texte lisible
 */
function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

// ── Composant principal ───────────────────────────────────────────────────

export default function ARScreen({ spots = [], userLocation, onClose, onSpotPress }) {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [heading, setHeading] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [location, setLocation] = useState(userLocation);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ── Low-pass filter refs pour stabiliser heading & pitch ──────────
  const ALPHA = 0.12; // facteur de lissage (0 = immobile, 1 = brut). 0.12 = très stable
  const smoothHeading = useRef(0);
  const smoothPitch = useRef(0);

  /** Lissage circulaire (gère le passage 359° → 0°) */
  function smoothAngle(prev, next, alpha) {
    const diff = next - prev;
    // Normalise la différence entre -180 et +180
    const wrapped = ((diff + 540) % 360) - 180;
    return (prev + wrapped * alpha + 360) % 360;
  }

  /** Lissage linéaire classique */
  function lerp(prev, next, alpha) {
    return prev + (next - prev) * alpha;
  }

  // ── Permissions & Fade in ────────────────────────────────────────────
  useEffect(() => {
    requestPermission();
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  // ── Location watcher ──────────────────────────────────────────────────
  useEffect(() => {
    let sub;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5 },
        (loc) => {
          setLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        },
      );
    })();
    return () => sub?.remove();
  }, []);

  // ── Magnetometer (heading / boussole) ──────────────────────────────
  useEffect(() => {
    Magnetometer.setUpdateInterval(50);
    const sub = Magnetometer.addListener(({ x, y }) => {
      let angle = Math.atan2(y, x) * (180 / Math.PI);
      angle = (angle + 360) % 360;
      const corrected = (360 - angle + 90) % 360;
      // Appliquer le filtre passe-bas circulaire
      smoothHeading.current = smoothAngle(smoothHeading.current, corrected, ALPHA);
      setHeading(smoothHeading.current);
    });
    return () => sub.remove();
  }, []);

  // ── DeviceMotion (pitch / inclinaison) ─────────────────────────────
  useEffect(() => {
    DeviceMotion.setUpdateInterval(50);
    const sub = DeviceMotion.addListener((data) => {
      if (data?.rotation) {
        const pitchDeg = (data.rotation.beta * 180) / Math.PI;
        // Appliquer le filtre passe-bas linéaire
        smoothPitch.current = lerp(smoothPitch.current, pitchDeg, ALPHA);
        setPitch(smoothPitch.current);
      }
    });
    return () => sub.remove();
  }, []);

  // ── Calcul des spots visibles avec leur position écran ──────────────
  const visibleSpots = useMemo(() => {
    if (!location) return [];

    return spots
      .map((spot) => {
        const dist = getDistance(
          { latitude: location.latitude, longitude: location.longitude },
          { latitude: spot.latitude, longitude: spot.longitude },
        );
        if (dist > MAX_DISTANCE_M) return null;

        const bearing = getBearing(
          location.latitude,
          location.longitude,
          spot.latitude,
          spot.longitude,
        );

        // Différence angulaire entre le heading et le bearing du spot
        const deltaH = normalizeAngle(bearing - heading);

        // Position X sur l'écran (centre = 0°)
        const xRatio = deltaH / H_FOV;
        const screenX = SCREEN_W / 2 + xRatio * SCREEN_W;

        // Position Y basée sur le pitch (quand on lève le téléphone, les spots montent)
        // On centre les spots à l'horizon (pitch ~= 0 quand téléphone horizontal)
        const pitchOffset = pitch * (SCREEN_H / V_FOV);
        const screenY = SCREEN_H * 0.45 + pitchOffset;

        // On considère visible si dans un FOV élargi (pour animation douce)
        const isVisible = Math.abs(deltaH) < H_FOV * 0.65;

        // Taille selon la distance (plus proche = plus gros)
        const scale = Math.max(0.5, Math.min(1.5, 1 - dist / MAX_DISTANCE_M + 0.5));

        return {
          ...spot,
          distance: dist,
          bearing,
          deltaH,
          screenX,
          screenY,
          isVisible,
          scale,
        };
      })
      .filter(Boolean)
      .filter((s) => s.isVisible)
      .sort((a, b) => b.distance - a.distance); // Render far spots first (behind)
  }, [spots, location, heading, pitch]);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleSpotTap = useCallback(
    (spot) => {
      setSelectedSpot((prev) => (prev?.id === spot.id ? null : spot));
    },
    [],
  );

  const handleInfoPress = useCallback(() => {
    if (selectedSpot && onSpotPress) {
      onSpotPress(selectedSpot);
    }
  }, [selectedSpot, onSpotPress]);

  const styles = useMemo(() => makeStyles(colors), [colors]);

  // ── Permission not granted ─────────────────────────────────────────
  if (!permission?.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionIcon}>📷</Text>
        <Text style={styles.permissionTitle}>Caméra requise</Text>
        <Text style={styles.permissionText}>
          Autorisez l'accès à la caméra pour utiliser la vue en réalité augmentée
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Autoriser la caméra</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.closeButtonPerm} onPress={onClose}>
          <Text style={styles.closeButtonPermText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Render principal ──────────────────────────────────────────────────
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Caméra en fond */}
      <CameraView style={styles.camera} facing="back" />

      {/* Overlay semi-transparent pour lisibilité */}
      <View style={styles.overlay}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonIcon}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Vue AR</Text>
            <Text style={styles.headerSubtitle}>
              {visibleSpots.length} spot{visibleSpots.length !== 1 ? 's' : ''} visible{visibleSpots.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.compassWrap}>
            <Text style={styles.compassText}>{Math.round(heading)}°</Text>
            <Text style={styles.compassDir}>{getCardinalDirection(heading)}</Text>
          </View>
        </View>

        {/* Spots AR markers */}
        {visibleSpots.map((spot) => (
          <TouchableOpacity
            key={spot.id}
            style={[
              styles.arMarker,
              {
                left: spot.screenX - 30 * spot.scale,
                top: spot.screenY - 30 * spot.scale,
                transform: [{ scale: spot.scale }],
              },
            ]}
            onPress={() => handleSpotTap(spot)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.markerDot,
                selectedSpot?.id === spot.id && styles.markerDotSelected,
              ]}
            >
              <Text style={styles.markerIcon}>🤿</Text>
            </View>
            <View style={styles.markerLabel}>
              <Text style={styles.markerName} numberOfLines={1}>
                {spot.nom}
              </Text>
              <Text style={styles.markerDistance}>{formatDistance(spot.distance)}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Info card du spot sélectionné */}
        {selectedSpot && (
          <View style={styles.infoCard}>
            <View style={styles.infoCardHeader}>
              <Text style={styles.infoCardTitle}>{selectedSpot.nom}</Text>
              <TouchableOpacity onPress={() => setSelectedSpot(null)}>
                <Text style={styles.infoCardClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.infoCardLocation}>
              📍 {selectedSpot.localite}
            </Text>
            <View style={styles.infoCardDetails}>
              <InfoPill
                label="Profondeur"
                value={`${selectedSpot.profondeur_min}-${selectedSpot.profondeur_max}m`}
                colors={colors}
              />
              <InfoPill
                label="Difficulté"
                value={selectedSpot.difficulte}
                colors={colors}
              />
              <InfoPill
                label="Distance"
                value={formatDistance(selectedSpot.distance)}
                colors={colors}
              />
            </View>
            {selectedSpot.type_site && (
              <Text style={styles.infoCardType}>
                🏷 {selectedSpot.type_site}
              </Text>
            )}
            <TouchableOpacity style={styles.infoCardButton} onPress={handleInfoPress}>
              <Text style={styles.infoCardButtonText}>Voir les détails</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Hint en bas */}
        {!selectedSpot && (
          <View style={styles.hintWrap}>
            <Text style={styles.hintText}>
              Bougez le téléphone pour explorer les spots autour de vous
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ── Direction cardinale ───────────────────────────────────────────────────
function getCardinalDirection(heading) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  const index = Math.round(heading / 45) % 8;
  return dirs[index];
}

// ── InfoPill ──────────────────────────────────────────────────────────────
function InfoPill({ label, value, colors }) {
  return (
    <View style={{
      backgroundColor: colors.primaryDim,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
      marginRight: 8,
      marginBottom: 6,
    }}>
      <Text style={{ fontSize: 9, color: colors.textSecondary, fontWeight: '600' }}>
        {label}
      </Text>
      <Text style={{ fontSize: 12, color: colors.textPrimary, fontWeight: '700' }}>
        {value}
      </Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const makeStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#000',
    },
    camera: {
      ...StyleSheet.absoluteFillObject,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
    },

    // ── Header ──
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: Platform.OS === 'ios' ? 56 : 32,
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeButtonIcon: {
      fontSize: 18,
      color: '#fff',
      fontWeight: '700',
    },
    headerCenter: {
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: '#fff',
      letterSpacing: 0.5,
    },
    headerSubtitle: {
      fontSize: 11,
      color: 'rgba(255,255,255,0.65)',
      marginTop: 2,
    },
    compassWrap: {
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    compassText: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.primary,
    },
    compassDir: {
      fontSize: 10,
      color: 'rgba(255,255,255,0.7)',
      fontWeight: '600',
    },

    // ── AR Markers ──
    arMarker: {
      position: 'absolute',
      alignItems: 'center',
      zIndex: 10,
    },
    markerDot: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: 'rgba(0,229,255,0.25)',
      borderWidth: 2,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 12,
      elevation: 8,
    },
    markerDotSelected: {
      backgroundColor: 'rgba(255,71,87,0.35)',
      borderColor: colors.accent,
      shadowColor: colors.accent,
    },
    markerIcon: {
      fontSize: 22,
    },
    markerLabel: {
      backgroundColor: 'rgba(0,0,0,0.72)',
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      marginTop: 4,
      alignItems: 'center',
      maxWidth: 130,
    },
    markerName: {
      fontSize: 11,
      fontWeight: '700',
      color: '#fff',
    },
    markerDistance: {
      fontSize: 9,
      color: colors.primary,
      fontWeight: '600',
    },

    // ── Info Card ──
    infoCard: {
      position: 'absolute',
      bottom: 40,
      left: 16,
      right: 16,
      backgroundColor: 'rgba(8,15,28,0.92)',
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.primaryMid,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.35,
      shadowRadius: 20,
      elevation: 16,
    },
    infoCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    infoCardTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: '#fff',
      flex: 1,
    },
    infoCardClose: {
      fontSize: 16,
      color: 'rgba(255,255,255,0.5)',
      padding: 4,
    },
    infoCardLocation: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.65)',
      marginBottom: 10,
    },
    infoCardDetails: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 8,
    },
    infoCardType: {
      fontSize: 12,
      color: colors.primary,
      marginBottom: 12,
    },
    infoCardButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    infoCardButtonText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#000',
    },

    // ── Hint ──
    hintWrap: {
      position: 'absolute',
      bottom: 40,
      left: 24,
      right: 24,
      alignItems: 'center',
    },
    hintText: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.6)',
      textAlign: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },

    // ── Permission screen ──
    permissionContainer: {
      flex: 1,
      backgroundColor: colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    permissionIcon: {
      fontSize: 64,
      marginBottom: 24,
    },
    permissionTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 12,
    },
    permissionText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 28,
    },
    permissionButton: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 32,
      marginBottom: 12,
    },
    permissionButtonText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#000',
    },
    closeButtonPerm: {
      paddingVertical: 12,
    },
    closeButtonPermText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
  });
