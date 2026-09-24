/**
 * TopoSiteMap – Composant de carte interactive & plan bathymétrique pour les guides de plongée
 * Bascule entre la carte satellite (avec polygones GeoJSON cliquables, entrées hachurées)
 * et le plan en mode réduit (avec affichage des infos sous la carte hors plein écran).
 */

import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
} from 'react-native';
import MapView from 'react-native-map-clustering';
import { Marker, Polygon } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { radius, shadows } from '../theme';
import ZoomableTopoViewer from './ZoomableTopoViewer';

// Assets locaux disponibles pour les topos
const TOPO_LOCAL_ASSETS = {
  'topo-frioul-pomegues.jpg': require('../../assets/topo-frioul-pomegues.jpg'),
  'topo-le-junker-88.jpg': require('../../assets/topo-le-junker-88.jpg'),
  'topo-pierre-a-corbes.jpg': require('../../assets/topo-pierre-a-corbes.jpg'),
  'topo-tiboulen-du-frioul.jpg': require('../../assets/topo-tiboulen-du-frioul.jpg'),
  'topo-cap-caveau.jpg': require('../../assets/topo-cap-caveau.jpg'),
  'topo-pierre-a-oeil.jpg': require('../../assets/topo-pierre-a-oeil.jpg'),
};

/**
 * Dictionnaire étendu d'icônes selon les détails / sous-types sous-marins
 */
const DETAIL_ICONS = {
  // Épaves maritimes
  bateau: '🚢',
  navire: '🚢',
  cargo: '🚢',
  chalutier: '🚢',
  remorqueur: '🚢',
  voilier: '⛵',
  sous_marin: '⚓',
  sousmarin: '⚓',
  peniche: '🚢',
  // Épaves aériennes
  avion: '✈️',
  aeronef: '✈️',
  bombardier: '✈️',
  chasseur: '✈️',
  helicoptere: '🚁',
  helico: '🚁',
  // Archéologie, vestiges & cargaisons
  amphore: '🏺',
  amphores: '🏺',
  poterie: '🏺',
  canon: '💣',
  artillerie: '💣',
  vestiges: '🏛️',
  ruines: '🏛️',
  ancre: '⚓',
  coffre: '🪙',
  tresor: '🪙',
  statue: '🗿',
  // Relief sous-marin & formations rocheuses
  grotte: '🕳️',
  cavite: '🕳️',
  tunnel: '🕳️',
  boyau: '🕳️',
  arche: '⛩️',
  faille: '⚡',
  sec: '🪨',
  pinacle: '🪨',
  roche: '🪨',
  tombant: '🧱',
  mur: '🧱',
  plateau: '🌊',
  sable: '🏖️',
  // Faune & flore marine
  faune: '🐟',
  poisson: '🐟',
  merou: '🐟',
  barracuda: '🐟',
  requin: '🦈',
  dauphin: '🐬',
  corail: '🪸',
  gorgone: '🪸',
  posidonie: '🌿',
  herbier: '🌿',
  eponge: '🧽',
};

/**
 * Styles visuels de base par grand type de zone
 */
const BASE_TYPE_STYLES = {
  mouillage: { strokeColor: '#00E5FF', fillColor: 'rgba(0, 229, 255, 0.40)', icon: '⚓', label: 'Mouillage' },
  epave: { strokeColor: '#FFD700', fillColor: 'rgba(255, 215, 0, 0.45)', icon: '🚢', label: 'Épave' },
  grotte: { strokeColor: '#A855F7', fillColor: 'rgba(168, 85, 247, 0.45)', icon: '🕳️', label: 'Grotte' },
  entree: { strokeColor: '#10B981', fillColor: 'rgba(16, 185, 129, 0.25)', lineDashPattern: [6, 4], icon: '🚪', label: 'Entrée Grotte' },
  sec: { strokeColor: '#F59E0B', fillColor: 'rgba(245, 158, 11, 0.35)', icon: '🪨', label: 'Sec' },
  tombant: { strokeColor: '#EC4899', fillColor: 'rgba(236, 72, 153, 0.35)', icon: '🧱', label: 'Tombant' },
  faune: { strokeColor: '#3B82F6', fillColor: 'rgba(59, 130, 246, 0.35)', icon: '🐟', label: 'Faune' },
  flore: { strokeColor: '#22C55E', fillColor: 'rgba(34, 197, 94, 0.35)', icon: '🌿', label: 'Flore' },
};

/**
 * Détermine le style, la couleur et l'icône de façon extensible :
 * 1. Propriété explicite dans le GeoJSON (`properties.icon` ou `properties.emoji`)
 * 2. Correspondance détaillée (`properties.detail` ou `properties.sous_type`)
 * 3. Type général (`properties.type`)
 * 4. Repli générique
 */
const getFeatureStyle = (typeOrProps, directDetail) => {
  const props =
    typeof typeOrProps === 'object' && typeOrProps !== null
      ? typeOrProps
      : { type: typeOrProps, detail: directDetail };

  const type = (props.type || '').toLowerCase().trim();
  const detail = (props.detail || props.sous_type || '').toLowerCase().trim();

  const base = BASE_TYPE_STYLES[type] || {
    strokeColor: '#FF4757',
    fillColor: 'rgba(255, 71, 87, 0.35)',
    icon: '📍',
    label: props.type ? props.type.charAt(0).toUpperCase() + props.type.slice(1) : 'Zone',
  };

  // 1. Icône explicite déclarée dans le GeoJSON (icon ou emoji)
  // 2. Icône selon le détail / sous-type
  // 3. Icône par défaut du type
  const icon = props.icon || props.emoji || DETAIL_ICONS[detail] || base.icon;

  // Construction du libellé
  let label = base.label;
  if (props.label) {
    label = props.label;
  } else if (props.detail) {
    const detailCapitalized = props.detail.charAt(0).toUpperCase() + props.detail.slice(1);
    label = `${base.label} (${detailCapitalized})`;
  }

  return {
    ...base,
    strokeColor: props.strokeColor || props.color || base.strokeColor,
    fillColor: props.fillColor || base.fillColor,
    icon,
    label,
  };
};

/**
 * Récupère la description depuis les propriétés GeoJSON (n'invente aucun texte de repli)
 */
const getFeatureDescription = (properties) => {
  return properties?.description ? String(properties.description).trim() : '';
};

/**
 * Convertit les coordonnées GPS nautiques (ex: "43°17'976\"N - 5°17'517\"E")
 * ou renvoie les coordonnées par défaut du spot.
 */
const parseGpsCoords = (gpsStr, defaultLat, defaultLng) => {
  if (!gpsStr) return { latitude: defaultLat || 43.27, longitude: defaultLng || 5.28 };
  try {
    const parts = gpsStr.split('-');
    if (parts.length === 2) {
      const parseDMS = (str) => {
        const match = str.match(/(\d+)°\s*(\d+)['′\.](\d+)?["″]?\s*([NSEWOU])/i);
        if (!match) return null;
        const deg = parseFloat(match[1]);
        const min = parseFloat(match[2]);
        const secStr = match[3] ? match[3] : '0';
        const minFraction = parseFloat(`${min}.${secStr}`);
        let val = deg + minFraction / 60;
        const dir = match[4].toUpperCase();
        if (dir === 'S' || dir === 'W' || dir === 'O') val = -val;
        return val;
      };
      const lat = parseDMS(parts[0]);
      const lng = parseDMS(parts[1]);
      if (lat !== null && lng !== null) {
        return { latitude: lat, longitude: lng };
      }
    }
  } catch (e) {
    console.log('Erreur parsing GPS TopoSiteMap:', e);
  }
  return { latitude: defaultLat || 43.27, longitude: defaultLng || 5.28 };
};

const TopoSiteMap = ({ topo, spot }) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  // Mode d'affichage dans la carte réduite : 'map' (carte satellite) ou 'plan' (image schéma)
  const [viewMode, setViewMode] = useState('map');
  const [fullscreenMap, setFullscreenMap] = useState(false);
  const [fullscreenPlan, setFullscreenPlan] = useState(false);
  // Zone sélectionnée (au clic sur polygone ou marqueur)
  const [selectedZone, setSelectedZone] = useState(null);

  // Conversion des polygones GeoJSON & filtrage des marqueurs
  const geojsonPolygons = useMemo(() => {
    if (!topo?.geojson?.features) return { rawPolygons: [], markers: [] };

    const rawPolygons = [];
    const markers = [];

    topo.geojson.features.forEach((feature, idx) => {
      if (feature.geometry?.type === 'Polygon' && feature.geometry.coordinates?.[0]) {
        const coords = feature.geometry.coordinates[0].map(([lng, lat]) => ({
          latitude: lat,
          longitude: lng,
        }));

        const lats = coords.map((c) => c.latitude);
        const lngs = coords.map((c) => c.longitude);
        const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
        const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

        const type = feature.properties?.type;
        const detail = feature.properties?.detail;
        const style = getFeatureStyle(feature.properties);

        const polyObj = {
          id: `poly-${idx}`,
          type,
          detail,
          coords,
          center: { latitude: centerLat, longitude: centerLng },
          style,
          properties: feature.properties || {},
        };

        rawPolygons.push(polyObj);

        // Ne créer un marqueur badge QUE si le type n'est PAS 'entree'
        if (type !== 'entree') {
          const displayTitle =
            feature.properties?.titre ||
            feature.properties?.nom ||
            feature.properties?.name ||
            style.label;
          markers.push({
            id: `marker-${idx}`,
            center: { latitude: centerLat, longitude: centerLng },
            displayIcon: style.icon,
            displayTitle,
            displayDesc: getFeatureDescription(feature.properties),
          });
        }
      }
    });

    return { rawPolygons, markers };
  }, [topo?.geojson]);

  // Calcul des coordonnées cibles : si GeoJSON est présent, on centre sur la zone principale
  const targetCoords = useMemo(() => {
    if (geojsonPolygons.rawPolygons.length > 0) {
      return geojsonPolygons.rawPolygons[0].center;
    }
    return parseGpsCoords(topo?.coordonnees_gps, spot?.latitude, spot?.longitude);
  }, [geojsonPolygons.rawPolygons, topo?.coordonnees_gps, spot?.latitude, spot?.longitude]);

  const mapDelta = geojsonPolygons.rawPolygons.length > 0 ? 0.0025 : 0.005;

  const imageSource = useMemo(() => {
    if (!topo?.plan_image) return null;
    return TOPO_LOCAL_ASSETS[topo.plan_image]
      ? TOPO_LOCAL_ASSETS[topo.plan_image]
      : { uri: topo.plan_image };
  }, [topo?.plan_image]);

  if (!topo && !spot) return null;

  const siteTitle = topo?.titre || spot?.nom || 'Site de plongée';
  const siteSubTitle = topo?.sous_titre || spot?.localite || '';

  const handleSelectPoly = (poly) => {
    const title =
      poly.properties?.titre ||
      poly.properties?.nom ||
      poly.properties?.name ||
      poly.style.label;
    setSelectedZone({
      id: poly.id,
      icon: poly.style.icon,
      title,
      description: getFeatureDescription(poly.properties),
    });
  };

  const renderMapElements = () => (
    <>
      {/* Marqueur du point central du spot */}
      <Marker
        coordinate={{
          latitude: targetCoords.latitude,
          longitude: targetCoords.longitude,
        }}
        title={siteTitle}
        description={siteSubTitle}
      />

      {/* Dessin des contours de toutes les zones GeoJSON cliquables */}
      {geojsonPolygons.rawPolygons.map((poly) => {
        const isSelected = selectedZone?.id === poly.id;
        return (
          <Polygon
            key={poly.id}
            coordinates={poly.coords}
            strokeColor={isSelected ? '#FFFFFF' : poly.style.strokeColor}
            fillColor={isSelected ? poly.style.fillColor.replace('0.25', '0.6').replace('0.4', '0.7') : poly.style.fillColor}
            strokeWidth={isSelected ? 3 : 2}
            lineDashPattern={poly.style.lineDashPattern}
            tappable={true}
            onPress={() => handleSelectPoly(poly)}
          />
        );
      })}

      {/* Rendu des marqueurs (Grotte, Épave, Mouillage - hors entrée) */}
      {geojsonPolygons.markers.map((marker) => (
        <Marker
          key={marker.id}
          coordinate={marker.center}
          title={marker.displayTitle}
          description={marker.displayDesc || undefined}
          onPress={() =>
            setSelectedZone({
              id: marker.id,
              icon: marker.displayIcon,
              title: marker.displayTitle,
              description: marker.displayDesc || '',
            })
          }
        >
          <View style={styles.poiBadge}>
            <Text style={styles.poiBadgeText}>{marker.displayIcon}</Text>
          </View>
        </Marker>
      ))}
    </>
  );

  return (
    <View style={styles.card}>
      {/* ── En-tête de la carte / plan ── */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.cardIcon}>{viewMode === 'map' ? '🗺️' : '📐'}</Text>
          <Text style={styles.cardTitle}>
            {viewMode === 'map' ? 'Localisation & Carte du Site' : 'Schéma & Plan Bathymétrique'}
          </Text>
        </View>
      </View>

      {/* ── Container Réduit (240px) ── */}
      <View style={styles.mapContainer}>
        {viewMode === 'map' ? (
          /* ── Vue Carte Satellite Réduite ── */
          <>
            {imageSource && (
              <TouchableOpacity
                style={styles.planBadge}
                onPress={() => setViewMode('plan')}
                activeOpacity={0.85}
              >
                <Text style={styles.planBadgeText}>🖼️ Voir le plan</Text>
              </TouchableOpacity>
            )}

            <MapView
              mapType="satellite"
              style={styles.topoMap}
              region={{
                latitude: targetCoords.latitude,
                longitude: targetCoords.longitude,
                latitudeDelta: mapDelta,
                longitudeDelta: mapDelta,
              }}
              scrollEnabled={true}
              zoomEnabled={true}
              pitchEnabled={false}
              rotateEnabled={false}
              showsZoomControls={false}
              toolbarEnabled={false}
              onPress={() => setSelectedZone(null)}
            >
              {renderMapElements()}
            </MapView>

            <LinearGradient
              colors={['transparent', 'rgba(5,10,16,0.85)']}
              style={styles.imageOverlay}
              pointerEvents="box-none"
            >
              <View style={styles.overlayInfoRow}>
                <Text style={styles.overlayLegend}>📍 {siteTitle}</Text>
                <TouchableOpacity onPress={() => setFullscreenMap(true)}>
                  <Text style={styles.overlayHint}>🔍 Carte plein écran</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </>
        ) : (
          /* ── Vue Plan Réduit (Image 240px) ── */
          <>
            <TouchableOpacity
              style={styles.planBadge}
              onPress={() => setViewMode('map')}
              activeOpacity={0.85}
            >
              <Text style={styles.planBadgeText}>🗺️ Voir la carte</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.imagePressArea}
              activeOpacity={0.92}
              onPress={() => setFullscreenPlan(true)}
            >
              <Image source={imageSource} style={styles.topoImage} resizeMode="contain" />
            </TouchableOpacity>

            <LinearGradient
              colors={['transparent', 'rgba(5,10,16,0.85)']}
              style={styles.imageOverlay}
              pointerEvents="box-none"
            >
              <View style={styles.overlayInfoRow}>
                <Text style={styles.overlayLegend}>📐 {siteTitle}</Text>
                <TouchableOpacity onPress={() => setFullscreenPlan(true)}>
                  <Text style={styles.overlayHint}>🔍 Agrandir le plan</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </>
        )}
      </View>

      {/* ── Encadré d'information sur la zone sélectionnée (affiché en dessous de la carte hors plein écran) ── */}
      {selectedZone && (
        <View style={styles.selectedZoneBox}>
          <View style={[styles.selectedZoneHeader, !selectedZone.description && { marginBottom: 0 }]}>
            <View style={styles.selectedZoneTitleRow}>
              <Text style={styles.selectedZoneIcon}>{selectedZone.icon}</Text>
              <Text style={styles.selectedZoneTitle} numberOfLines={1}>
                {selectedZone.title}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setSelectedZone(null)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.selectedZoneClose}>✕</Text>
            </TouchableOpacity>
          </View>
          {!!selectedZone.description && (
            <Text style={styles.selectedZoneDesc}>{selectedZone.description}</Text>
          )}
        </View>
      )}

      {/* ── Modal Carte Plein Écran ── */}
      <Modal
        visible={fullscreenMap}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setFullscreenMap(false)}
      >
        <SafeAreaView style={styles.fullscreenMapSafeArea}>
          <View style={styles.fullscreenMapHeader}>
            <TouchableOpacity
              style={styles.fullscreenCloseBtn}
              onPress={() => setFullscreenMap(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.fullscreenCloseBtnText}>✕ Fermer</Text>
            </TouchableOpacity>
            <Text style={styles.fullscreenMapTitle} numberOfLines={1}>
              {siteTitle}
            </Text>
          </View>

          <View style={styles.fullscreenMapBody}>
            <MapView
              mapType="satellite"
              style={styles.fullscreenMap}
              initialRegion={{
                latitude: targetCoords.latitude,
                longitude: targetCoords.longitude,
                latitudeDelta: mapDelta,
                longitudeDelta: mapDelta,
              }}
              scrollEnabled={true}
              zoomEnabled={true}
              pitchEnabled={true}
              rotateEnabled={true}
              showsZoomControls={false}
              toolbarEnabled={false}
              onPress={() => setSelectedZone(null)}
            >
              {renderMapElements()}
            </MapView>

            {/* Bulle d'information flottante en bas de l'écran en mode plein écran */}
            {selectedZone && (
              <View style={styles.zoneInfoCardFullscreen}>
                <View style={[styles.zoneInfoHeader, !selectedZone.description && { marginBottom: 0 }]}>
                  <View style={styles.zoneInfoTitleRow}>
                    <Text style={styles.zoneInfoIcon}>{selectedZone.icon}</Text>
                    <Text style={styles.zoneInfoTitle} numberOfLines={1}>
                      {selectedZone.title}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedZone(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.zoneInfoClose}>✕</Text>
                  </TouchableOpacity>
                </View>
                {!!selectedZone.description && (
                  <Text style={styles.zoneInfoDesc}>{selectedZone.description}</Text>
                )}
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── Modal Plan Topo Zoomable (Visualiseur Image Plein Écran) ── */}
      {imageSource && (
        <Modal
          visible={fullscreenPlan}
          transparent
          animationType="fade"
          onRequestClose={() => setFullscreenPlan(false)}
        >
          <ZoomableTopoViewer
            source={imageSource}
            title={`${siteTitle} – Plan bathymétrique`}
            onClose={() => setFullscreenPlan(false)}
          />
        </Modal>
      )}
    </View>
  );
};

TopoSiteMap.propTypes = {
  topo: PropTypes.object,
  spot: PropTypes.object,
};

const makeStyles = (colors, isDark) => StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl || 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardIcon: {
    fontSize: 18,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  mapContainer: {
    width: '100%',
    height: 240,
    borderRadius: radius.lg || 14,
    overflow: 'hidden',
    backgroundColor: isDark ? '#050A10' : '#E8EEF8',
    position: 'relative',
  },
  planBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(5, 10, 16, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill || 999,
    borderWidth: 1,
    borderColor: colors.primaryMid || 'rgba(0, 229, 255, 0.4)',
    zIndex: 20,
    elevation: 5,
  },
  planBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary || '#00E5FF',
  },
  imagePressArea: {
    width: '100%',
    height: '100%',
  },
  topoImage: {
    width: '100%',
    height: '100%',
  },
  topoMap: {
    width: '100%',
    height: '100%',
  },
  poiBadge: {
    backgroundColor: 'rgba(5, 10, 16, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  poiBadgeText: {
    fontSize: 15,
  },
  selectedZoneBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.primaryDim || 'rgba(0, 229, 255, 0.1)',
    borderRadius: radius.md || 12,
    borderWidth: 1,
    borderColor: colors.primaryMid || 'rgba(0, 229, 255, 0.3)',
  },
  selectedZoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  selectedZoneTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  selectedZoneIcon: {
    fontSize: 18,
  },
  selectedZoneTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    flex: 1,
  },
  selectedZoneClose: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    paddingHorizontal: 4,
  },
  selectedZoneDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  zoneInfoCardFullscreen: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: isDark ? 'rgba(5, 10, 16, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    borderRadius: radius.md || 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.primaryMid || 'rgba(0, 229, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 35,
  },
  zoneInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  zoneInfoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  zoneInfoIcon: {
    fontSize: 16,
  },
  zoneInfoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    flex: 1,
  },
  zoneInfoClose: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    paddingHorizontal: 4,
  },
  zoneInfoDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
  },
  imageOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 50,
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  overlayInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overlayLegend: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
  },
  overlayHint: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
  },
  fullscreenMapSafeArea: {
    flex: 1,
    backgroundColor: isDark ? '#050A10' : '#111827',
  },
  fullscreenMapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: isDark ? 'rgba(5,10,16,0.95)' : '#1F2937',
    zIndex: 10,
  },
  fullscreenCloseBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill || 999,
  },
  fullscreenCloseBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
  fullscreenMapTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  fullscreenMapBody: {
    flex: 1,
  },
  fullscreenMap: {
    width: '100%',
    height: '100%',
  },
});

export default TopoSiteMap;
