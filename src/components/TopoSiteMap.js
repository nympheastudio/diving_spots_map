/**
 * TopoSiteMap – Composant de carte interactive & plan bathymétrique pour les guides de plongée
 * Bascule entre la carte standard (avec polygones GeoJSON cliquables, entrées hachurées)
 * et le plan en mode réduit (avec affichage des infos sous la carte hors plein écran).
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Polygon, Polyline } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTheme } from '../context/ThemeContext';
import { radius, shadows } from '../theme';
import ZoomableTopoViewer from './ZoomableTopoViewer';
import OutlineIcon from './OutlineIcon';
import {
  DEPTH_COLOR_SCALE,
  getDepthStyle as _getDepthStyle,
  parseGpsCoords,
  calculateDistance,
  smoothAngle,
  formatDistance,
  getStraightLineDistance,
  getBearingToPoint,
  getRelativeBearing,
} from '../utils/topoUtils';

// Assets locaux disponibles pour les topos
const TOPO_LOCAL_ASSETS = {
  'topo-frioul-pomegues.jpg': require('../../assets/topo-frioul-pomegues.jpg'),
  'topo-le-junker-88.jpg': require('../../assets/topo-le-junker-88.jpg'),
  'topo-pierre-a-corbes.jpg': require('../../assets/topo-pierre-a-corbes.jpg'),
  'topo-tiboulen-du-frioul.jpg': require('../../assets/topo-tiboulen-du-frioul.jpg'),
  'topo-cap-caveau.jpg': require('../../assets/topo-cap-caveau.jpg'),
  'topo-pierre-a-oeil.jpg': require('../../assets/topo-pierre-a-oeil.jpg'),
  'topo-tiboulen-de-maire.jpg': require('../../assets/topo-tiboulen-de-maire.jpg'),
  'topo-la-grotte-a-corail.jpg': require('../../assets/topo-la-grotte-a-corail.jpg'),
};

const USER_BEARING_ICON = require('../../assets/user_bearing.png');

const getCompassPoint = (bearing) => {
  if (bearing == null) return '—';
  return ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'][Math.round(bearing / 45) % 8];
};

const getScale = (region) => {
  if (!region?.longitudeDelta || !region?.latitude) return null;
  const width = Dimensions.get('window').width;
  const mapWidth = calculateDistance(
    region.latitude, region.longitude - region.longitudeDelta / 2,
    region.latitude, region.longitude + region.longitudeDelta / 2
  );
  if (!mapWidth || !width) return null;
  const targetMeters = mapWidth * 0.24;
  const power = 10 ** Math.floor(Math.log10(targetMeters));
  const rounded = [1, 2, 5, 10].map((n) => n * power).filter((n) => n <= targetMeters).pop() || power;
  return { meters: rounded, width: Math.max(35, Math.min(125, rounded / mapWidth * width)) };
};

const DETAIL_ICONS = {
  // Navigation & Épaves
  bateau: '🚢',
  voilier: '⛵',
  ancre: '⚓',
  // Aérien
  avion: '✈️',
  helicoptere: '🚁',
  // Archéologie & Vestiges
  amphore: '🏺',
  vestiges: '🏛️',
  statue: '🗿',
  // Relief sous-marin
  grotte: '🕳️',
  entree: '🚪',
  arche: '⛩️',
  sec: '🪨',
  rocher: '🪨',
  tombant: '🧱',
  plateau: '🌊',
  sable: '🏖️',
  // Faune & Flore
  poisson: '🐟',
  requin: '🦈',
  dauphin: '🐬',
  corail: '🪸',
  posidonie: '🌿',
};

// DEPTH_COLOR_SCALE, getDepthStyle, parseGpsCoords, calculateDistance,
// smoothAngle et formatDistance sont importes depuis '../utils/topoUtils'

// getDepthStyle est re-exporte depuis topoUtils sous le nom _getDepthStyle
// On cree un alias local pour la compatibilite interne.
const getDepthStyle = _getDepthStyle;

/**
 * Styles visuels de base par grand type de zone
 */
const BASE_TYPE_STYLES = {
  mouillage: { strokeColor: '#00E5FF', fillColor: 'rgba(0, 229, 255, 0.40)', icon: '⚓', label: 'Mouillage' },
  epave: { strokeColor: '#FFD700', fillColor: 'rgba(255, 215, 0, 0.45)', icon: '🚢', label: 'Épave' },
  grotte: { strokeColor: '#A855F7', fillColor: 'rgba(168, 85, 247, 0.45)', icon: '🕳️', label: 'Grotte' },
  entree: { strokeColor: '#10B981', fillColor: 'rgba(16, 185, 129, 0.25)', lineDashPattern: [6, 4], icon: '🚪', label: 'Entrée Grotte' },
  sec: { strokeColor: '#F59E0B', fillColor: 'rgba(245, 158, 11, 0.35)', icon: '🪨', label: 'Sec' },
  rocher: { strokeColor: '#F59E0B', fillColor: 'rgba(245, 158, 11, 0.40)', icon: '🪨', label: 'Rocher' },
  tombant: { strokeColor: '#EC4899', fillColor: 'rgba(236, 72, 153, 0.35)', icon: '🧱', label: 'Tombant' },
  faune: { strokeColor: '#3B82F6', fillColor: 'rgba(59, 130, 246, 0.35)', icon: '🐟', label: 'Faune' },
  flore: { strokeColor: '#22C55E', fillColor: 'rgba(34, 197, 94, 0.35)', icon: '🌿', label: 'Flore' },
  zone: { strokeColor: '#38BDF8', fillColor: 'rgba(56, 189, 248, 0.25)', icon: '🌊', label: 'Zone' },
};

/**
 * Détermine le style, la couleur et l'icône de façon extensible :
 * 1. Propriété explicite dans le GeoJSON (`properties.icon` ou `properties.emoji`) : mot-clé ou emoji direct
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
  const detail = (props.detail || props.sous_type || '').toString().toLowerCase().trim();

  // Traitement spécifique pour les zones de profondeur bathymétriques
  if (type === 'zone' || (type === 'profondeur' && props.isPolygon)) {
    const hasDepth =
      (props.profondeur !== undefined && props.profondeur !== null && props.profondeur !== '') ||
      (props.detail !== undefined && props.detail !== null && props.detail !== '' && !isNaN(parseFloat(props.detail)));

    const depthVal = props.profondeur !== undefined && props.profondeur !== '' ? props.profondeur : props.detail;
    const depthStyle = hasDepth
      ? getDepthStyle(depthVal)
      : { strokeColor: '#38BDF8', fillColor: 'rgba(56, 189, 248, 0.25)', icon: '🌊', label: props.label || 'Zone' };

    let strokeColor = depthStyle.strokeColor;
    let fillColor = depthStyle.fillColor;

    // Si une couleur personnalisée est spécifiée
    const customColor = props.strokeColor || props.color;
    if (customColor && customColor !== 0 && customColor !== '0') {
      strokeColor = customColor;
      if (props.fillColor) {
        fillColor = props.fillColor;
      } else if (typeof strokeColor === 'string' && strokeColor.startsWith('#') && strokeColor.length === 7) {
        const r = parseInt(strokeColor.slice(1, 3), 16) || 74;
        const g = parseInt(strokeColor.slice(3, 5), 16) || 222;
        const b = parseInt(strokeColor.slice(5, 7), 16) || 128;
        fillColor = `rgba(${r}, ${g}, ${b}, 0.25)`;
      }
    } else if (props.fillColor) {
      fillColor = props.fillColor;
    }

    const titleText = props.titre || props.nom || depthStyle.label;
    const icon = props.icon && props.icon !== 0 && props.icon !== '0'
      ? (DETAIL_ICONS[props.icon] || props.icon)
      : '🌊';

    return {
      strokeColor,
      fillColor,
      icon,
      label: titleText,
    };
  }

  const base = BASE_TYPE_STYLES[type] || {
    strokeColor: '#FF4757',
    fillColor: 'rgba(255, 71, 87, 0.35)',
    icon: '📍',
    label: props.type ? props.type.charAt(0).toUpperCase() + props.type.slice(1) : 'Zone',
  };

  // 1. Icône explicite déclarée dans le GeoJSON (mot-clé du dictionnaire ou emoji direct)
  // 2. Sinon icône selon le détail / sous-type
  // 3. Sinon icône par défaut du type
  const iconCandidate = (props.icon || props.emoji || '').toString().toLowerCase().trim();
  const icon =
    DETAIL_ICONS[iconCandidate] ||
    BASE_TYPE_STYLES[iconCandidate]?.icon ||
    props.icon ||
    props.emoji ||
    DETAIL_ICONS[detail] ||
    base.icon;

  // Construction du libellé
  let label = base.label;
  if (props.label) {
    label = props.label;
  } else {
    const parts = [];
    if (props.detail && String(props.detail).trim()) {
      const detailStr = String(props.detail).trim();
      parts.push(detailStr.charAt(0).toUpperCase() + detailStr.slice(1));
    }
    if (
      props.profondeur !== undefined &&
      props.profondeur !== null &&
      String(props.profondeur).trim() !== ''
    ) {
      parts.push(`${props.profondeur} m`);
    }
    if (parts.length > 0) {
      label = `${base.label} (${parts.join(' - ')})`;
    }
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

// parseGpsCoords est importe depuis '../utils/topoUtils'

// calculateDistance, formatDistance et smoothAngle sont importes depuis '../utils/topoUtils'

/** Le point GPS reste au centre ; seul le cône et la flèche tournent avec le cap. */
const UserBearingMarker = React.memo(({ coordinate, heading, isFullscreen }) => {
  if (!coordinate?.latitude || !coordinate?.longitude) return null;

  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      zIndex={100}
      tracksViewChanges={true}
      tappable={false}
    >
      {isFullscreen ? (
        <View style={userMarkerStyles.container} pointerEvents="none">
          {heading != null && (
            <View style={[userMarkerStyles.direction, { transform: [{ rotate: `${heading}deg` }] }]}>
              <View style={userMarkerStyles.cone} />
              <Ionicons name="arrow-up" size={38} color="#FFFFFF" style={userMarkerStyles.arrow} />
            </View>
          )}
          <View style={userMarkerStyles.glow} />
          <View style={userMarkerStyles.dotOuter}>
            <View style={userMarkerStyles.dotInner} />
          </View>
        </View>
      ) : (
        <Image
          source={USER_BEARING_ICON}
          style={{ width: 76, height: 76, transform: [{ rotate: `${heading ?? 0}deg` }] }}
          resizeMode="contain"
        />
      )}
    </Marker>
  );
});

const userMarkerStyles = StyleSheet.create({
  container: { width: 152, height: 152, alignItems: 'center', justifyContent: 'center' },
  direction: { position: 'absolute', width: 152, height: 152, left: 0, top: 0 },
  cone: {
    position: 'absolute', top: 0, left: 19, width: 0, height: 0,
    borderLeftWidth: 57, borderRightWidth: 57, borderTopWidth: 76,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: 'rgba(18,142,255,0.42)',
  },
  arrow: {
    position: 'absolute', top: 13, left: 57,
    textShadowColor: '#005CB6', textShadowRadius: 5,
    textShadowOffset: { width: 0, height: 1 },
  },
  glow: {
    position: 'absolute', width: 62, height: 62, borderRadius: 31,
    backgroundColor: 'rgba(25,142,255,0.27)',
  },
  dotOuter: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: '#168FFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#168FFF', shadowOpacity: 0.9, shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 }, elevation: 6,
  },
  dotInner: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#168FFF' },
});



/**
 * Composant Marker dédié avec gestion autonome de tracksViewChanges
 * pour garantir que chaque badge (sonde de profondeur ou icône) soit instantanément rendu
 * sur Android et iOS dès le premier affichage sur petit écran sans avoir besoin d'ouvrir le plein écran.
 */
const CustomTopoMarker = React.memo(({
  marker,
  isSelected,
  isFullscreen,
  styles,
  onPress,
  featured,
}) => {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    setTracksViewChanges(true);
    const timer = setTimeout(() => {
      setTracksViewChanges(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [isSelected, featured, marker.profondeur, marker.center?.latitude, marker.center?.longitude]);

  const poiColor = marker.type === 'mouillage' ? '#27D8F5'
    : marker.type === 'epave' ? '#FF9B45'
    : marker.type === 'grotte' || marker.type === 'entree' ? '#FFC247'
    : marker.type === 'tombant' ? '#C472F3' : '#9BD5E8';

  return (
    <Marker
      coordinate={marker.center}
      tracksViewChanges={tracksViewChanges}
      zIndex={isSelected ? 40 : (marker.isDepthPoint ? 12 : 20)}
      onPress={onPress}
      anchor={isFullscreen && marker.hasBadge && !marker.isDepthPoint ? { x: 0.5, y: 0.55 } : undefined}
    >
      {marker.isDepthPoint ? (
        <View
          pointerEvents="none"
          style={[
            styles.depthPointBadge,
            isSelected && styles.depthPointBadgeSelected,
            { borderColor: marker.depthColor || '#38BDF8' }
          ]}
        >
          <Text style={[styles.depthPointText, isSelected && styles.depthPointTextSelected]}>
            {marker.profondeur}
          </Text>
        </View>
      ) : isFullscreen && marker.hasBadge ? (
        <View pointerEvents="none" style={styles.fullscreenPoiMarker}>
          <View style={[styles.fullscreenPoiRing, { borderColor: poiColor }, (isSelected || featured) && styles.fullscreenPoiRingActive]}>
            <OutlineIcon name={marker.displayIcon} size={24} color={poiColor} />
          </View>
          <View style={[styles.fullscreenPoiDot, { backgroundColor: poiColor }]} />
        </View>
      ) : marker.hasBadge ? (
        <View pointerEvents="none" style={styles.poiBadge}>
          <OutlineIcon name={marker.displayIcon} size={21} color={poiColor} />
        </View>
      ) : (
        <View pointerEvents="none" style={{ width: 1, height: 1, opacity: 0 }} />
      )}
    </Marker>
  );
});

const TopoSiteMap = ({ topo, spot, userLocation: initialUserLocation = null, discoverRequest = 0 }) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const [fullscreenMap, setFullscreenMap] = useState(false);
  const [fullscreenPlan, setFullscreenPlan] = useState(false);
  const [fullscreenMapType, setFullscreenMapType] = useState('satellite');
  const [fullscreenRegion, setFullscreenRegion] = useState(null);
  const [fullscreenMapHeading, setFullscreenMapHeading] = useState(0);
  const [fullscreenSummaryHeight, setFullscreenSummaryHeight] = useState(180);
  const [fullscreenMapReady, setFullscreenMapReady] = useState(false);
  const autoFitGpsRef = useRef(false);
  const lastDiscoverRequestRef = useRef(discoverRequest);
  // Zone sélectionnée (au clic sur polygone ou marqueur)
  const [selectedZone, setSelectedZone] = useState(null);
  // Affichage replié/déplié de la légende bathymétrique en haut à droite
  const [legendExpanded, setLegendExpanded] = useState(true);

  useEffect(() => {
    const shouldOpen = discoverRequest > lastDiscoverRequestRef.current;
    lastDiscoverRequestRef.current = discoverRequest;
    if (!shouldOpen) return;
    autoFitGpsRef.current = false;
    setFullscreenMapReady(false);
    setFullscreenMapHeading(0);
    setFullscreenMap(true);
  }, [discoverRequest]);

  useEffect(() => {
    setSelectedZone(null);
    setFullscreenRegion(null);
  }, [topo?.id]);

  // Localisation utilisateur (pour calcul de distance et affichage natif)
  const [userCoords, setUserCoords] = useState(
    initialUserLocation?.latitude && initialUserLocation?.longitude
      ? { latitude: initialUserLocation.latitude, longitude: initialUserLocation.longitude }
      : null
  );
  const [hasLocationPermission, setHasLocationPermission] = useState(
    Boolean(initialUserLocation?.latitude && initialUserLocation?.longitude)
  );
  const [deviceHeading, setDeviceHeading] = useState(null);
  const headingRef = useRef(null);

  // Synchronisation avec initialUserLocation si disponible ou mis à jour
  useEffect(() => {
    if (initialUserLocation?.latitude && initialUserLocation?.longitude) {
      setUserCoords({
        latitude: initialUserLocation.latitude,
        longitude: initialUserLocation.longitude,
      });
      setHasLocationPermission(true);
    }
  }, [initialUserLocation?.latitude, initialUserLocation?.longitude]);

  // Pendant la carte agrandie, le point bleu suit la vraie position du téléphone.
  useEffect(() => {
    if (!fullscreenMap || !hasLocationPermission) return undefined;
    let active = true;
    let subscription;
    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 1500 },
      ({ coords }) => {
        if (active && Number.isFinite(coords?.latitude) && Number.isFinite(coords?.longitude)) {
          setUserCoords({ latitude: coords.latitude, longitude: coords.longitude });
        }
      }
    ).then((watcher) => {
      if (active) subscription = watcher;
      else watcher.remove();
    }).catch((error) => console.log('Position GPS indisponible :', error));
    return () => { active = false; subscription?.remove(); };
  }, [fullscreenMap, hasLocationPermission]);

  // watchHeadingAsync donne un cap géographique absolu, contrairement à l'angle alpha du gyroscope.
  useEffect(() => {
    if (!fullscreenMap || !hasLocationPermission) return undefined;
    headingRef.current = null;
    setDeviceHeading(null);
    let active = true;
    let subscription;
    Location.watchHeadingAsync(({ trueHeading, magHeading }) => {
      const raw = Number.isFinite(trueHeading) && trueHeading >= 0 ? trueHeading : magHeading;
      if (!active || !Number.isFinite(raw) || raw < 0) return;
      const next = headingRef.current == null ? raw : smoothAngle(headingRef.current, raw);
      if (headingRef.current == null || Math.abs(((next - headingRef.current + 540) % 360) - 180) >= 1) {
        headingRef.current = next;
        setDeviceHeading(next);
      }
    }).then((watcher) => {
      if (active) subscription = watcher;
      else watcher.remove();
    }).catch((error) => console.log('Cap du téléphone indisponible :', error));
    return () => { active = false; subscription?.remove(); };
  }, [fullscreenMap, hasLocationPermission]);

  const lastFeaturePressRef = useRef(0);
  const cardMapRef = useRef(null);
  const fullscreenMapRef = useRef(null);
  const refreshFullscreenMapHeading = useCallback(async () => {
    try {
      const camera = await fullscreenMapRef.current?.getCamera?.();
      if (Number.isFinite(camera?.heading)) setFullscreenMapHeading(camera.heading);
    } catch (error) {
      // Le cap de la carte reste à 0 si la caméra native n'est pas encore disponible.
    }
  }, []);

  // Récupération ponctuelle de la géolocalisation UNIQUEMENT si aucune position n'est fournie par le parent
  useEffect(() => {
    // Si le parent fournit déjà la localisation, aucun abonnement ni appel supplémentaire n'est requis
    if (initialUserLocation?.latitude && initialUserLocation?.longitude) {
      return;
    }

    let isMounted = true;

    (async () => {
      try {
        let { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          const req = await Location.requestForegroundPermissionsAsync();
          status = req.status;
        }
        if (status === 'granted' && isMounted) {
          setHasLocationPermission(true);

          // Récupération ponctuelle économique (Accuracy.Balanced) au lieu d'un watchPositionAsync haute fréquence
          const current = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (isMounted && current?.coords) {
            setUserCoords({
              latitude: current.coords.latitude,
              longitude: current.coords.longitude,
            });
          }
        }
      } catch (e) {
        console.log('Erreur init géolocalisation TopoSiteMap:', e);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [initialUserLocation?.latitude, initialUserLocation?.longitude]);

  // Conversion des polygones GeoJSON & filtrage des marqueurs
  const geojsonPolygons = useMemo(() => {
    if (!topo?.geojson?.features) return { rawPolygons: [], markers: [] };

    const rawPolygons = [];
    const markers = [];
    const getPoiDepth = (properties) => {
      const direct = Number(properties?.profondeur);
      if (Number.isFinite(direct) && direct > 0) return direct;
      const detail = String(properties?.detail || properties?.sous_type || '').toLowerCase();
      const type = String(properties?.type || '').toLowerCase();
      const pois = topo?.pois || [];
      const specific = detail && pois.find((poi) =>
        String(poi.id || '').toLowerCase().includes(detail)
        || String(poi.nom || '').toLowerCase().includes(detail)
      );
      const match = specific || pois.find((poi) => String(poi.type || '').toLowerCase() === type);
      return parseFloat(String(match?.profondeur ?? '').replace(',', '.')) || null;
    };

    topo.geojson.features.forEach((feature, idx) => {
      const geomType = feature.geometry?.type;
      if (geomType === 'Polygon' && feature.geometry.coordinates?.[0]?.length >= 3) {
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
        const style = getFeatureStyle({ ...feature.properties, isPolygon: true });
        const polyId = `poly-${idx}`;
        const markerId = `marker-${idx}`;

        const polyObj = {
          id: polyId,
          type,
          detail,
          coords,
          center: { latitude: centerLat, longitude: centerLng },
          style,
          properties: feature.properties || {},
        };

        rawPolygons.push(polyObj);

        // Titre du repère affiché dans le panneau inférieur.
        const rawTitle =
          feature.properties?.titre ||
          feature.properties?.nom ||
          feature.properties?.name ||
          style.label;

        // On associe un marqueur à chaque polygone (badge visible pour les POIs, invisible pour les entrées et zones de profondeur)
        markers.push({
          id: markerId,
          polyId,
          type,
          center: { latitude: centerLat, longitude: centerLng },
          displayIcon: style.icon,
          titleText: rawTitle,
          displayDesc: getFeatureDescription(feature.properties),
          depth: getPoiDepth(feature.properties),
          hasBadge: type !== 'entree' && type !== 'zone' && feature.properties?.hasBadge !== false,
        });
      } else if (geomType === 'Point' && Array.isArray(feature.geometry.coordinates) && feature.geometry.coordinates.length >= 2) {
        const [lng, lat] = feature.geometry.coordinates;
        const center = { latitude: lat, longitude: lng };
        const type = (feature.properties?.type || '').toLowerCase().trim();
        const markerId = `pt-marker-${idx}`;

        if (type === 'profondeur') {
          const depthVal = feature.properties?.profondeur !== undefined && feature.properties?.profondeur !== ''
            ? feature.properties.profondeur
            : feature.properties?.detail;
          const depthStyle = getDepthStyle(depthVal);
          const rawTitle = feature.properties?.titre || feature.properties?.nom || `Profondeur : ${depthVal} m`;

          markers.push({
            id: markerId,
            polyId: markerId,
            type: 'profondeur',
            isDepthPoint: true,
            profondeur: depthVal,
            center,
            displayIcon: '↕️',
            depthColor: depthStyle.strokeColor,
            titleText: rawTitle,
            displayDesc: getFeatureDescription(feature.properties) || `Sonde bathymétrique mesurée à ${depthVal} m`,
            hasBadge: true,
          });
        } else {
          // Autre point POI (ex: epave, mouillage, etc.)
          const style = getFeatureStyle(feature.properties);
          const rawTitle =
            feature.properties?.titre ||
            feature.properties?.nom ||
            feature.properties?.name ||
            style.label;

          markers.push({
            id: markerId,
            polyId: markerId,
            type,
            center,
            displayIcon: style.icon,
            titleText: rawTitle,
            displayDesc: getFeatureDescription(feature.properties),
            depth: getPoiDepth(feature.properties),
            hasBadge: true,
          });
        }
      }
    });

    // Trier les polygones : zones bathymétriques d'abord, POIs (mouillage, épave, etc.) au-dessus
    rawPolygons.sort((a, b) => {
      const aDepth = a.type === 'zone' || a.type === 'profondeur';
      const bDepth = b.type === 'zone' || b.type === 'profondeur';
      if (aDepth && !bDepth) return -1;
      if (!aDepth && bDepth) return 1;
      return 0;
    });

    return { rawPolygons, markers };
  }, [topo?.geojson, topo?.pois]);

  const featuredMarker = useMemo(() => {
    const pois = geojsonPolygons.markers.filter((marker) => marker.hasBadge && !marker.isDepthPoint);
    return pois.find((marker) => marker.type === 'epave' && /amphore/i.test(marker.titleText))
      || pois.find((marker) => marker.type === 'epave')
      || pois.find((marker) => marker.type === 'mouillage')
      || pois[0]
      || null;
  }, [geojsonPolygons.markers]);

  // Calcul des coordonnées cibles et cadrage : englobe l'ensemble des polygones ET des sondes/POIs
  const { targetCoords, mapDelta } = useMemo(() => {
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    let hasCoords = false;

    // Englobe tous les contours des polygones
    geojsonPolygons.rawPolygons.forEach((poly) => {
      poly.coords.forEach((c) => {
        minLat = Math.min(minLat, c.latitude);
        maxLat = Math.max(maxLat, c.latitude);
        minLng = Math.min(minLng, c.longitude);
        maxLng = Math.max(maxLng, c.longitude);
        hasCoords = true;
      });
    });

    // Englobe également tous les points (sondes de profondeur, POIs)
    geojsonPolygons.markers.forEach((m) => {
      if (m.center?.latitude && m.center?.longitude) {
        minLat = Math.min(minLat, m.center.latitude);
        maxLat = Math.max(maxLat, m.center.latitude);
        minLng = Math.min(minLng, m.center.longitude);
        maxLng = Math.max(maxLng, m.center.longitude);
        hasCoords = true;
      }
    });

    if (hasCoords) {
      const center = {
        latitude: (minLat + maxLat) / 2,
        longitude: (minLng + maxLng) / 2,
      };
      // Marge confortable (1.4x) pour que les sondes en bordure ne soient pas coupées sur le petit écran
      const latDelta = Math.max(0.0035, (maxLat - minLat) * 1.4);
      const lngDelta = Math.max(0.0035, (maxLng - minLng) * 1.4);
      return {
        targetCoords: center,
        mapDelta: Math.max(latDelta, lngDelta),
      };
    }

    const fallback = parseGpsCoords(topo?.coordonnees_gps, spot?.latitude, spot?.longitude);
    return {
      targetCoords: fallback,
      mapDelta: 0.005,
    };
  }, [geojsonPolygons, topo?.coordonnees_gps, spot?.latitude, spot?.longitude]);

  const navigationTarget = selectedZone?.center || featuredMarker?.center || targetCoords;

  // Animation fluide de la caméra sans réinitialiser la carte au clic
  useEffect(() => {
    if (cardMapRef.current && targetCoords) {
      try {
        cardMapRef.current.animateToRegion({
          latitude: targetCoords.latitude,
          longitude: targetCoords.longitude,
          latitudeDelta: mapDelta,
          longitudeDelta: mapDelta,
        }, 400);
      } catch (e) { }
    }
  }, [targetCoords?.latitude, targetCoords?.longitude, mapDelta]);

  const fitFullscreenMap = useCallback((includeUser = false) => {
    const map = fullscreenMapRef.current;
    if (!map) return;
    const coordinates = [
      targetCoords,
      ...geojsonPolygons.rawPolygons.flatMap((polygon) => polygon.coords),
      ...geojsonPolygons.markers.map((marker) => marker.center),
    ];
    if (includeUser && userCoords) coordinates.push(userCoords);
    try {
      if (coordinates.length > 1) {
        map.fitToCoordinates(coordinates, {
          edgePadding: {
            top: 105, right: 45,
            bottom: Math.min(fullscreenSummaryHeight + 28, Dimensions.get('window').height * 0.42), left: 45,
          },
          animated: true,
        });
      } else {
        map.animateToRegion({
          latitude: targetCoords.latitude,
          longitude: targetCoords.longitude,
          latitudeDelta: mapDelta,
          longitudeDelta: mapDelta,
        }, 300);
      }
    } catch (error) {
      console.log('Erreur cadrage du topo:', error);
    }
  }, [geojsonPolygons, targetCoords.latitude, targetCoords.longitude, mapDelta, userCoords?.latitude, userCoords?.longitude, fullscreenSummaryHeight]);
  const fitFullscreenSite = useCallback(() => fitFullscreenMap(false), [fitFullscreenMap]);
  const fitFullscreenOverview = useCallback(() => fitFullscreenMap(true), [fitFullscreenMap]);

  useEffect(() => {
    if (!fullscreenMap || !fullscreenMapReady || autoFitGpsRef.current) return undefined;
    const timer = setTimeout(() => {
      if (userCoords) {
        autoFitGpsRef.current = true;
        fitFullscreenOverview();
      } else {
        fitFullscreenSite();
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [fullscreenMap, fullscreenMapReady, topo?.id, userCoords?.latitude, userCoords?.longitude,
    fitFullscreenOverview, fitFullscreenSite]);

  const imageSource = useMemo(() => {
    if (!topo?.plan_image) return null;
    return TOPO_LOCAL_ASSETS[topo.plan_image]
      ? TOPO_LOCAL_ASSETS[topo.plan_image]
      : { uri: topo.plan_image };
  }, [topo?.plan_image]);

  // Distance calculée entre l'utilisateur et le centre de la plongée
  const distanceToSite = useMemo(() => {
    if (!userCoords?.latitude || !userCoords?.longitude || !targetCoords?.latitude || !targetCoords?.longitude) {
      return null;
    }
    return calculateDistance(
      userCoords.latitude,
      userCoords.longitude,
      targetCoords.latitude,
      targetCoords.longitude
    );
  }, [userCoords?.latitude, userCoords?.longitude, targetCoords?.latitude, targetCoords?.longitude]);

  const distanceFormatted = useMemo(() => {
    return formatDistance(distanceToSite);
  }, [distanceToSite]);

  const targetDistanceMeters = useMemo(() => {
    if (!userCoords || !navigationTarget) return null;
    return calculateDistance(userCoords.latitude, userCoords.longitude, navigationTarget.latitude, navigationTarget.longitude);
  }, [userCoords?.latitude, userCoords?.longitude, navigationTarget?.latitude, navigationTarget?.longitude]);
  const targetDistanceText = formatDistance(targetDistanceMeters);
  const bearingToTarget = useMemo(() => getBearingToPoint(userCoords, navigationTarget), [
    userCoords?.latitude, userCoords?.longitude, navigationTarget?.latitude, navigationTarget?.longitude,
  ]);
  const relativeBearing = getRelativeBearing(bearingToTarget, deviceHeading);
  const scale = useMemo(() => getScale(fullscreenRegion || {
    latitude: targetCoords.latitude,
    longitude: targetCoords.longitude,
    longitudeDelta: mapDelta,
  }), [fullscreenRegion, targetCoords.latitude, targetCoords.longitude, mapDelta]);

  // Distance en ligne droite jusqu'au repère réellement sélectionné sur la carte.
  const selectedZoneDistance = useMemo(() => {
    if (!selectedZone?.center) return null;
    return getStraightLineDistance(userCoords, selectedZone.center);
  }, [userCoords, selectedZone]);

  // Ajuster la caméra pour afficher à la fois le site de plongée et l'utilisateur
  const handleFitBoth = (isFullscreen = false) => {
    const map = isFullscreen ? fullscreenMapRef.current : cardMapRef.current;
    if (map && userCoords && navigationTarget) {
      try {
        if (targetDistanceMeters != null && targetDistanceMeters < 5) {
          map.animateToRegion({ ...navigationTarget, latitudeDelta: mapDelta, longitudeDelta: mapDelta }, 350);
        } else {
          map.fitToCoordinates([userCoords, navigationTarget], {
            edgePadding: isFullscreen
              ? { top: 90, right: 45, bottom: Math.min(fullscreenSummaryHeight + 28, Dimensions.get('window').height * 0.42), left: 45 }
              : { top: 60, right: 60, bottom: 60, left: 60 },
            animated: true,
          });
        }
      } catch (e) {
        console.log('Erreur fitToCoordinates:', e);
      }
    } else if (map && navigationTarget) {
      map.animateToRegion({
        ...navigationTarget,
        latitudeDelta: mapDelta,
        longitudeDelta: mapDelta,
      }, 350);
    }
  };

  const handleCenterSite = fitFullscreenSite;
  const closeFullscreenMap = () => {
    setFullscreenMap(false);
  };

  if (!topo && !spot) return null;

  const siteTitle = topo?.titre || spot?.nom || 'Site de plongée';
  const siteSubTitle = topo?.sous_titre || spot?.localite || '';
  const summaryTitle = selectedZone
    ? selectedZone.title
    : featuredMarker?.titleText || siteTitle;
  const summaryDescription = selectedZone?.description || (!selectedZone ? featuredMarker?.displayDesc : '') || '';
  const summaryKind = selectedZone?.type || featuredMarker?.type;
  const summaryType = ({ epave: 'Épave', grotte: 'Grotte', mouillage: 'Mouillage',
    rocher: 'Rocher', sec: 'Sec', tombant: 'Tombant', profondeur: 'Sonde',
    zone: 'Zone de profondeur', entree: 'Entrée' })[summaryKind]
    || spot?.type_site || 'Site de plongée';
  const summaryDepth = selectedZone?.depth != null && String(selectedZone.depth).trim()
    ? `${String(selectedZone.depth).trim().replace(/\s*m$/i, '')} m`
    : `${spot?.profondeur_min}–${spot?.profondeur_max} m`;
  const difficultyLabel = {
    Beginner: 'Débutant', Intermediate: 'Intermédiaire', Advanced: 'Expert',
  }[spot?.difficulte] || spot?.difficulte || 'Non renseigné';

  // Les détails du repère sélectionné s'affichent exclusivement dans le panneau inférieur.
  const handleSelectPoly = (poly, event) => {
    lastFeaturePressRef.current = Date.now();
    const title =
      poly.properties?.titre ||
      poly.properties?.nom ||
      poly.properties?.name ||
      poly.style.label;
    const isDepthZone =
      poly.type === 'zone' ||
      poly.type === 'profondeur' ||
      poly.properties?.type === 'zone' ||
      poly.properties?.type === 'profondeur' ||
      Boolean(poly.isDepthZone);

    const matchingMarker = geojsonPolygons.markers.find((marker) => marker.polyId === poly.id);
    const pressedCoordinate = event?.nativeEvent?.coordinate;
    const selectedCoordinate = Number.isFinite(pressedCoordinate?.latitude) && Number.isFinite(pressedCoordinate?.longitude)
      ? pressedCoordinate : poly.center;
    setSelectedZone({
      id: poly.id,
      type: poly.type || poly.properties?.type,
      depth: matchingMarker?.depth ?? poly.properties?.profondeur ?? null,
      icon: poly.style.icon,
      title,
      description: getFeatureDescription(poly.properties),
      center: selectedCoordinate,
      isDepthZone,
    });

  };

  const handleSelectMarker = (marker) => {
    lastFeaturePressRef.current = Date.now();
    const isDepthZone =
      Boolean(marker.isDepthPoint) ||
      marker.type === 'profondeur' ||
      marker.type === 'zone' ||
      Boolean(marker.isDepthZone);

    setSelectedZone({
      id: marker.polyId,
      type: marker.type,
      depth: marker.depth ?? marker.profondeur ?? null,
      icon: marker.displayIcon,
      title: marker.titleText,
      description: marker.displayDesc || '',
      center: marker.center,
      isDepthZone,
    });

  };

  const handleMapPress = (event) => {
    if (event?.nativeEvent?.action === 'marker-press' || Date.now() - lastFeaturePressRef.current < 250) return;
    setSelectedZone(null);
  };

  // Fermeture manuelle de l'encadré d'info
  const handleCloseZone = () => {
    setSelectedZone(null);
  };

  const renderMapElements = (isFullscreen = false) => (
    <>
      {/* Marqueur du point central du spot si aucun GeoJSON */}
      {geojsonPolygons.rawPolygons.length === 0 && (
        <Marker
          key={isFullscreen ? `fs-center-pin-${fullscreenMap}` : 'card-center-pin'}
          coordinate={{
            latitude: targetCoords.latitude,
            longitude: targetCoords.longitude,
          }}
          onPress={() => {
            lastFeaturePressRef.current = Date.now();
            setSelectedZone({ id: 'site-center', type: spot?.type_site,
              title: siteTitle, icon: 'location-outline', center: targetCoords,
              depth: null, description: siteSubTitle });
          }}
        />
      )}

      {/* Dessin des contours de toutes les zones GeoJSON cliquables */}
      {geojsonPolygons.rawPolygons.map((poly) => {
        const isSelected = selectedZone?.id === poly.id;
        const polyType = (poly.type || poly.properties?.type || '').toString().toLowerCase().trim();
        const isDepth = polyType === 'zone' || polyType === 'profondeur';
        const fillOpacity = isDepth ? (isSelected ? 0.27 : 0.13) : (isSelected ? 0.28 : 0.16);
        const softerFill = poly.style.fillColor.replace(/,\s*[\d.]+\)$/, `, ${fillOpacity})`);
        return (
          <Polygon
            key={isFullscreen ? `fs-poly-${poly.id}` : `card-poly-${poly.id}`}
            coordinates={poly.coords}
            strokeColor={isSelected ? '#FFFFFF' : (isDepth ? (isFullscreen && poly.id === 'poly-0' ? '#00E5A0' : 'transparent') : poly.style.strokeColor)}
            fillColor={isFullscreen ? softerFill : poly.style.fillColor}
            strokeWidth={isSelected ? 2.5 : (isDepth ? (isFullscreen && poly.id === 'poly-0' ? 2 : 0) : 2)}
            lineDashPattern={isDepth ? undefined : poly.style.lineDashPattern}
            zIndex={isSelected ? 35 : (isDepth ? 2 : 15)}
            tappable={true}
            onPress={(event) => handleSelectPoly(poly, event)}
          />
        );
      })}

      {isFullscreen && userCoords && targetDistanceMeters != null && (
        <Polyline
          coordinates={[userCoords, navigationTarget]}
          strokeColor="rgba(255,255,255,0.9)"
          strokeWidth={2}
          lineDashPattern={[8, 7]}
          zIndex={18}
        />
      )}

      {/* Repères de profondeur et points d'intérêt */}
      {geojsonPolygons.markers.map((marker) => {
        const isSelected = selectedZone?.id === marker.polyId
          || (isFullscreen && !selectedZone && marker.id === featuredMarker?.id);
        return (
          <CustomTopoMarker
            key={isFullscreen ? `fs-marker-${marker.id}-${topo?.id}` : `card-marker-${marker.id}-${topo?.id}`}
            marker={marker}
            isSelected={isSelected}
            isFullscreen={isFullscreen}
            styles={styles}
            featured={isFullscreen && (selectedZone ? selectedZone.id === marker.polyId : marker.id === featuredMarker?.id)}
            onPress={() => handleSelectMarker(marker)}
          />
        );
      })}

      {/* Position de l'utilisateur avec cône de visée fluide et boussole temps réel */}
      {userCoords && (
        <UserBearingMarker
          key={isFullscreen ? 'fs-user-bearing' : 'card-user-bearing'}
          coordinate={userCoords}
          heading={isFullscreen && deviceHeading != null
            ? (deviceHeading - fullscreenMapHeading + 360) % 360
            : deviceHeading}
          isFullscreen={isFullscreen}
        />
      )}
    </>
  );

  // Rendu de la légende bathymétrique en haut à droite
  const renderDepthLegend = (isFullscreen = false) => (
    <View style={[styles.depthLegend, isFullscreen && styles.depthLegendFullscreen]}>
      <TouchableOpacity
        style={styles.depthLegendHeader}
        onPress={() => setLegendExpanded((prev) => !prev)}
        activeOpacity={0.8}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Text style={styles.depthLegendTitle}>Profondeur</Text>
        <OutlineIcon name={legendExpanded ? 'chevron-up-outline' : 'chevron-down-outline'} size={16} color={colors.primary} />
      </TouchableOpacity>
      {legendExpanded && (
        <View style={styles.depthLegendList}>
          {DEPTH_COLOR_SCALE.map((item, idx) => (
            <View key={idx} style={styles.depthLegendRow}>
              <View style={[styles.depthColorDot, { backgroundColor: item.stroke }]} />
              <Text style={styles.depthLegendText}>{item.label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.card}>
      {/* ── En-tête de la carte / plan ── */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <OutlineIcon name="map-outline" size={23} color={colors.primary} />
          <Text style={styles.cardTitle}>Localisation & Carte du Site</Text>
        </View>
      </View>

      {/* ── Container Réduit (240px) ── */}
      <View style={styles.mapContainer}>
        <>
            <MapView
              ref={cardMapRef}
              key={`card-map-${topo?.id || 'default'}`}
              mapType="satellite"
              style={styles.topoMap}
              initialRegion={{
                latitude: targetCoords.latitude,
                longitude: targetCoords.longitude,
                latitudeDelta: mapDelta,
                longitudeDelta: mapDelta,
              }}
              onMapReady={() => {
                if (cardMapRef.current && targetCoords) {
                  try {
                    cardMapRef.current.animateToRegion({
                      latitude: targetCoords.latitude,
                      longitude: targetCoords.longitude,
                      latitudeDelta: mapDelta,
                      longitudeDelta: mapDelta,
                    }, 250);
                  } catch (e) { }
                }
              }}
              scrollEnabled={true}
              zoomEnabled={true}
              pitchEnabled={false}
              rotateEnabled={false}
              showsZoomControls={false}
              toolbarEnabled={false}
              showsUserLocation={false}
              showsMyLocationButton={false}
              followsUserLocation={false}
              showsCompass={true}
              onPress={handleMapPress}
            >
              {renderMapElements(false)}
            </MapView>

            {/* ── Légende des profondeurs en haut à droite ── */}
            {renderDepthLegend(false)}

            <LinearGradient
              colors={['transparent', 'rgba(5,10,16,0.85)']}
              style={styles.imageOverlay}
              pointerEvents="box-none"
            >
              <View style={styles.overlayInfoRow}>
                <View style={styles.overlayTitleCol}>
                  <Text style={styles.overlayLegend} numberOfLines={1}>{siteTitle}</Text>
                  {distanceFormatted && (
                    <TouchableOpacity onPress={() => handleFitBoth(false)} activeOpacity={0.75}>
                      <Text style={styles.overlayDistance}>
                        {distanceToSite < 50 ? 'Sur le site' : `À ${distanceFormatted} (Ajuster la vue)`}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </LinearGradient>
        </>
      </View>

      <View style={styles.siteSummary}>
        <Image source={{ uri: spot?.photos_fond_marin?.[0] || spot?.photo }} style={styles.siteSummaryImage} />
        <View style={styles.siteSummaryText}>
          <Text style={styles.siteSummaryTitle} numberOfLines={2}>{topo?.titre || spot?.nom}</Text>
          <Text style={styles.siteSummarySub} numberOfLines={2}>{spot?.localite} · {spot?.profondeur_min}–{spot?.profondeur_max} m</Text>
        </View>
        <Ionicons name="water-outline" size={24} color={colors.primary} />
      </View>

      {/* ── Encadré d'information sur la zone sélectionnée (affiché en dessous de la carte hors plein écran) ── */}
      {selectedZone && (
        <View style={styles.selectedZoneBox}>
          <View style={[styles.selectedZoneHeader, !selectedZone.description && { marginBottom: 0 }]}>
            <View style={styles.selectedZoneTitleRow}>
              <OutlineIcon name={selectedZone.icon} size={20} color={colors.primary} />
              <View style={styles.selectedZoneTitleCol}>
                <Text style={styles.selectedZoneTitle} numberOfLines={1}>
                  {selectedZone.title}
                </Text>
                {selectedZoneDistance && (
                  <Text style={styles.selectedZoneDistanceText}>
                    À {selectedZoneDistance}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              onPress={handleCloseZone}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <OutlineIcon name="close-outline" size={22} color={colors.textSecondary} />
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
        onRequestClose={closeFullscreenMap}
        onDismiss={() => setFullscreenMapReady(false)}
      >
        <SafeAreaView style={styles.fullscreenMapSafeArea}>
          <StatusBar barStyle="light-content" backgroundColor="#03111F" />
          <View style={styles.fullscreenMapBody}>
            <MapView
              ref={fullscreenMapRef}
              mapType={fullscreenMapType}
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
              showsUserLocation={false}
              showsMyLocationButton={false}
              followsUserLocation={false}
              showsCompass={false}
              onRegionChangeComplete={(region) => {
                setFullscreenRegion(region);
                refreshFullscreenMapHeading();
              }}
              onMapReady={() => {
                setFullscreenMapReady(true);
                refreshFullscreenMapHeading();
              }}
              onPress={handleMapPress}
            >
              {renderMapElements(true)}
            </MapView>

            <View style={styles.fullscreenMapHeader}>
              <View style={styles.fullscreenTitlePill}>
                <Text style={styles.fullscreenMapTitle} numberOfLines={1} ellipsizeMode="tail">{spot?.nom || siteTitle}</Text>
              </View>
              <TouchableOpacity
                style={styles.fullscreenCloseBtn}
                onPress={closeFullscreenMap}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Fermer la carte"
              >
                <OutlineIcon name="close-outline" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Légende et commandes cartographiques */}
            {renderDepthLegend(true)}
            <View style={styles.fullscreenMapButtons}>
              <TouchableOpacity
                style={styles.fullscreenMapButton}
                onPress={() => setFullscreenMapType((current) => current === 'satellite' ? 'standard' : 'satellite')}
                onLongPress={() => imageSource && setFullscreenPlan(true)}
                accessibilityLabel="Changer le fond de carte"
              >
                <Ionicons name="layers-outline" size={23} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.fullscreenMapButton} onPress={() => handleFitBoth(true)} accessibilityLabel="Voir ma position GPS et le repère sélectionné">
                <OutlineIcon name="locate-outline" size={23} color={colors.primary} />
                {userCoords && <View style={styles.mapControlGpsDot} />}
              </TouchableOpacity>
              <TouchableOpacity style={styles.fullscreenMapButton} onPress={handleCenterSite} accessibilityLabel="Recentrer sur le site">
                <OutlineIcon name="scan-outline" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {scale && (
              <View style={[styles.fullscreenScale, { bottom: fullscreenSummaryHeight + 28 }]} pointerEvents="none">
                <View style={[styles.fullscreenScaleLabels, { width: scale.width }]}>
                  <Text style={styles.fullscreenScaleText}>0</Text>
                  <Text style={styles.fullscreenScaleText}>
                    {scale.meters >= 1000 ? `${scale.meters / 2000} km` : `${scale.meters / 2}`}
                  </Text>
                  <Text style={styles.fullscreenScaleText}>
                    {scale.meters >= 1000 ? `${scale.meters / 1000} km` : `${scale.meters} m`}
                  </Text>
                </View>
                <View style={[styles.fullscreenScaleLine, { width: scale.width }]} />
              </View>
            )}

            <TouchableOpacity style={[styles.fullscreenCompass, { bottom: fullscreenSummaryHeight + 18 }]} onPress={() => handleFitBoth(true)} activeOpacity={0.86} accessibilityLabel="Afficher ma position et le cap du repère sélectionné">
              <View style={styles.fullscreenCompassInner}>
                <View style={[styles.compassDial, { transform: [{ rotate: `${-(deviceHeading ?? 0)}deg` }] }]}>
                  <Text style={styles.compassNorth}>N</Text>
                  <Text style={styles.compassWest}>O</Text>
                  <Text style={styles.compassEast}>E</Text>
                  <Text style={styles.compassSouth}>S</Text>
                </View>
                {relativeBearing != null && (
                  <View style={[styles.compassNeedle, { transform: [{ rotate: `${relativeBearing}deg` }] }]}>
                    <OutlineIcon name="arrow-up-outline" size={22} color={colors.primary} />
                  </View>
                )}
                <Text style={styles.compassDistance} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{targetDistanceText || 'GPS'}</Text>
                <Text style={styles.compassBearing} numberOfLines={1}>
                  {bearingToTarget == null ? 'Position indisponible' : `${getCompassPoint(bearingToTarget)} ${Math.round(bearingToTarget)}°`}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.fullscreenSiteSummary} onLayout={(event) => {
              const height = Math.round(event.nativeEvent.layout.height);
              setFullscreenSummaryHeight((current) => current === height ? current : height);
            }}>
              <View style={styles.fullscreenHandle} />
              <View style={styles.fullscreenSiteRow}>
                <Image source={{ uri: spot?.photos_fond_marin?.[0] || spot?.photo }} style={styles.fullscreenSiteImage} />
                <View style={styles.fullscreenSiteText}>
                  <Text style={styles.fullscreenSiteTitle} numberOfLines={2}>{summaryTitle}</Text>
                  <Text style={styles.fullscreenSiteLocation} numberOfLines={1}>{siteTitle}</Text>
                </View>
                {targetDistanceText && (
                  <TouchableOpacity style={styles.fullscreenDistanceBadge} onPress={() => handleFitBoth(true)} accessibilityLabel="Voir ma position GPS et le repère sélectionné">
                    <View style={styles.gpsBadgeLabel}><View style={styles.gpsBadgeDot} /><Text style={styles.gpsBadgeLabelText}>GPS</Text></View>
                    <Text style={styles.fullscreenSiteDistance} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{targetDistanceText}</Text>
                  </TouchableOpacity>
                )}
              </View>
              {!!summaryDescription && (
                <Text style={styles.fullscreenSiteDescription} numberOfLines={2}>{summaryDescription}</Text>
              )}
              <View style={styles.fullscreenMetrics}>
                <View style={styles.fullscreenMetricCard}>
                  <Ionicons name="water-outline" size={20} color={colors.primary} />
                  <View style={styles.fullscreenMetricText}><Text style={styles.fullscreenMetricLabel}>Profondeur</Text><Text style={styles.fullscreenMetricValue} numberOfLines={1} adjustsFontSizeToFit>{summaryDepth}</Text></View>
                </View>
                <View style={styles.fullscreenMetricCard}>
                  <OutlineIcon name="bar-chart-outline" size={20} color="#4ADE80" />
                  <View style={styles.fullscreenMetricText}><Text style={styles.fullscreenMetricLabel}>Niveau du site</Text><Text style={styles.fullscreenMetricValue} numberOfLines={1} adjustsFontSizeToFit>{difficultyLabel}</Text></View>
                </View>
                <View style={styles.fullscreenMetricCard}>
                  <Ionicons name="boat-outline" size={20} color="#C472F3" />
                  <View style={styles.fullscreenMetricText}><Text style={styles.fullscreenMetricLabel}>Type</Text><Text style={styles.fullscreenMetricValue} numberOfLines={1} adjustsFontSizeToFit>{summaryType}</Text></View>
                </View>
              </View>
            </View>

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
  userLocation: PropTypes.object,
  discoverRequest: PropTypes.number,
};

const makeStyles = (colors, isDark) => StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderMid,
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
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  mapContainer: {
    width: '100%',
    height: 300,
    borderRadius: radius.lg || 14,
    overflow: 'hidden',
    backgroundColor: isDark ? '#050A10' : '#E8EEF8',
    position: 'relative',
  },
  siteSummary: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.borderMid,
    borderRadius: 18, padding: 10, marginTop: 12,
  },
  siteSummaryImage: { width: 66, height: 66, borderRadius: 12, backgroundColor: colors.bg },
  siteSummaryText: { flex: 1, minWidth: 0, gap: 5 },
  siteSummaryTitle: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
  siteSummarySub: { fontSize: 12, color: colors.textSecondary },
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  poiBadgeText: {
    fontSize: 15,
    textAlign: 'center',
  },
  fullscreenPoiMarker: {
    width: 122,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenPoiRing: {
    width: 43, height: 43, borderRadius: 22, borderWidth: 2,
    backgroundColor: '#03111F', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#00DDF5', shadowOpacity: 0.45, shadowRadius: 8,
  },
  fullscreenPoiRingActive: {
    width: 49, height: 49, borderRadius: 25, borderWidth: 3,
    borderColor: '#FFFFFF', shadowOpacity: 0.8, shadowRadius: 12,
  },
  fullscreenPoiDot: { width: 7, height: 7, borderRadius: 4, marginTop: 3 },
  depthPointBadge: {
    backgroundColor: isDark ? 'rgba(5, 10, 16, 0.90)' : 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
  depthPointBadgeSelected: {
    backgroundColor: '#0284C7',
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.15 }],
  },
  depthPointText: {
    fontSize: 10,
    fontWeight: '800',
    color: isDark ? '#F1F5F9' : '#0F172A',
    textAlign: 'center',
  },
  depthPointTextSelected: {
    color: '#FFFFFF',
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
  selectedZoneTitleCol: {
    flex: 1,
    justifyContent: 'center',
  },
  selectedZoneTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  selectedZoneDistanceText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary || '#00E5FF',
    marginTop: 2,
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
  fullscreenMapSafeArea: {
    flex: 1,
    backgroundColor: '#03111F',
  },
  fullscreenMapHeader: {
    position: 'absolute', left: 0, right: 0, top: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 5,
    zIndex: 10,
  },
  fullscreenTitlePill: {
    flex: 1,
    minWidth: 0,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: 'rgba(3,17,31,0.86)',
    borderWidth: 1,
    borderColor: colors.borderBright,
    justifyContent: 'center',
  },
  fullscreenCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(3,17,31,0.86)',
    borderWidth: 1,
    borderColor: colors.borderBright,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenMapTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'left',
  },
  fullscreenMapBody: {
    flex: 1,
  },
  fullscreenMap: {
    width: '100%',
    height: '100%',
  },
  depthLegend: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(5, 10, 16, 0.88)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    zIndex: 25,
    elevation: 6,
    minWidth: 88,
  },
  depthLegendFullscreen: {
    top: 80,
    left: 12,
    right: undefined,
    paddingHorizontal: 11,
    paddingVertical: 9,
    minWidth: 124,
    borderRadius: 13,
    backgroundColor: 'rgba(3,17,31,0.93)',
    borderColor: colors.borderMid,
  },
  depthLegendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  depthLegendTitle: {
    fontSize: 9.5,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  depthLegendToggle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary || '#00E5FF',
  },
  depthLegendList: {
    marginTop: 4,
    gap: 3,
  },
  depthLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  depthColorDot: {
    width: 10,
    height: 7,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  depthLegendText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  fullscreenMapButtons: {
    position: 'absolute', top: 80, right: 12, gap: 7, zIndex: 28,
  },
  fullscreenMapButton: {
    width: 43, height: 43, borderRadius: 23, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(3,17,31,0.94)', borderWidth: 1, borderColor: colors.borderMid,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6,
  },
  mapControlGpsDot: {
    position: 'absolute', right: 7, bottom: 6, width: 7, height: 7,
    borderRadius: 4, backgroundColor: '#258BFF', borderWidth: 1, borderColor: '#FFFFFF',
  },
  fullscreenScale: {
    position: 'absolute', left: 18, bottom: 280, zIndex: 19,
    alignItems: 'flex-start',
  },
  fullscreenScaleLabels: {
    width: 110, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3,
  },
  fullscreenScaleText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF', textShadowColor: '#00111F', textShadowRadius: 5 },
  fullscreenScaleLine: { height: 6, borderLeftWidth: 2, borderRightWidth: 2, borderBottomWidth: 2, borderColor: '#FFFFFF' },
  fullscreenCompass: {
    position: 'absolute', right: 12, bottom: 271, width: 128, height: 128,
    borderRadius: 64, borderWidth: 3, borderColor: colors.primary,
    backgroundColor: 'rgba(3,17,31,0.95)', zIndex: 23,
    shadowColor: colors.primary, shadowOpacity: 0.68, shadowRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  fullscreenCompassInner: {
    width: 110, height: 110, borderRadius: 55, borderWidth: 1,
    borderColor: colors.borderMid, alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  compassDial: { position: 'absolute', width: 108, height: 108, alignItems: 'center' },
  compassNorth: { position: 'absolute', top: 1, fontSize: 12, color: colors.accent, fontWeight: '900' },
  compassWest: { position: 'absolute', left: 5, top: 47, fontSize: 11, color: colors.textSecondary, fontWeight: '800' },
  compassEast: { position: 'absolute', right: 5, top: 47, fontSize: 11, color: colors.textSecondary, fontWeight: '800' },
  compassSouth: { position: 'absolute', bottom: 1, fontSize: 11, color: colors.textSecondary, fontWeight: '800' },
  compassNeedle: {
    position: 'absolute', left: 5, top: 5, width: 100, height: 100,
    alignItems: 'center', paddingTop: 19,
  },
  compassDistance: {
    position: 'absolute', top: 50, width: 94, textAlign: 'center',
    fontSize: 19, lineHeight: 23, color: '#FFFFFF', fontWeight: '900',
  },
  compassBearing: {
    position: 'absolute', top: 76, width: 94, textAlign: 'center',
    fontSize: 10, color: colors.primary, fontWeight: '800',
  },
  fullscreenSiteSummary: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(3,17,31,0.97)', borderTopLeftRadius: 27, borderTopRightRadius: 27,
    borderWidth: 1, borderBottomWidth: 0, borderColor: colors.borderMid,
    paddingHorizontal: 14, paddingTop: 9, paddingBottom: 13,
    zIndex: 22,
  },
  fullscreenHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.textMuted, alignSelf: 'center', marginBottom: 12 },
  fullscreenSiteRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fullscreenSiteImage: { width: 72, height: 72, flexShrink: 0, borderRadius: 12, backgroundColor: colors.bg },
  fullscreenSiteText: { flex: 1, minWidth: 0, gap: 5 },
  fullscreenSiteTitle: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },
  fullscreenSiteLocation: { fontSize: 11, color: colors.textSecondary },
  fullscreenSiteDescription: { marginTop: 8, fontSize: 11, lineHeight: 15, color: colors.textSecondary },
  fullscreenDistanceBadge: {
    flexShrink: 0, width: 84, paddingHorizontal: 5, paddingVertical: 6,
    borderRadius: 12, borderWidth: 1, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  gpsBadgeLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gpsBadgeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#258BFF', borderWidth: 1, borderColor: '#FFFFFF' },
  gpsBadgeLabelText: { fontSize: 9, fontWeight: '800', color: colors.textSecondary },
  fullscreenSiteDistance: { width: 72, textAlign: 'center', fontSize: 12, fontWeight: '800', color: colors.primary },
  fullscreenMetrics: { flexDirection: 'row', gap: 6, marginTop: 11 },
  fullscreenMetricCard: {
    flex: 1, minWidth: 0, minHeight: 49, flexDirection: 'row', gap: 5,
    alignItems: 'center', paddingHorizontal: 6, paddingVertical: 6,
    borderRadius: 11, borderWidth: 1, borderColor: colors.borderMid,
    backgroundColor: colors.bgElevated,
  },
  fullscreenMetricText: { flex: 1, minWidth: 0 },
  fullscreenMetricLabel: { fontSize: 9, color: colors.textSecondary },
  fullscreenMetricValue: { fontSize: 10, fontWeight: '800', color: colors.primary },
  // Overlay bas colonne titre + distance
  overlayTitleCol: {
    flex: 1,
    marginRight: 8,
  },
  overlayDistance: {
    fontSize: 10,
    color: '#00E5FF',
    fontWeight: '700',
    marginTop: 2,
  },
});

export default TopoSiteMap;
