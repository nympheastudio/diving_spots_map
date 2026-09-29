/**
 * TopoSiteMap – Composant de carte interactive & plan bathymétrique pour les guides de plongée
 * Bascule entre la carte satellite (avec polygones GeoJSON cliquables, entrées hachurées)
 * et le plan en mode réduit (avec affichage des infos sous la carte hors plein écran).
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
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
import MapView, { Marker, Polygon } from 'react-native-maps';
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
  'topo-tiboulen-de-maire.jpg': require('../../assets/topo-tiboulen-de-maire.jpg'),
  'topo-la-grotte-a-corail.jpg': require('../../assets/topo-la-grotte-a-corail.jpg'),
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

/**
 * Palette de couleurs pour les zones de profondeur (isobathes / bathymétrie) :
 * - 1 à 10 m : bleue (#38BDF8)
 * - 11 à 20 m : vert clair (#4ADE80)
 * - 21 à 30 m : orange (#FB923C)
 * - 31 à 40 m : violet (#C084FC)
 * - 41 m et + : rouge (#F87171)
 */
const DEPTH_COLOR_SCALE = [
  { max: 10, stroke: '#38BDF8', fill: 'rgba(56, 189, 248, 0.25)', label: '1 à 10 m' },
  { max: 20, stroke: '#4ADE80', fill: 'rgba(74, 222, 128, 0.25)', label: '11 à 20 m' },
  { max: 30, stroke: '#FB923C', fill: 'rgba(251, 146, 60, 0.30)', label: '21 à 30 m' },
  { max: 40, stroke: '#C084FC', fill: 'rgba(192, 132, 252, 0.30)', label: '31 à 40 m' },
  { max: Infinity, stroke: '#F87171', fill: 'rgba(248, 113, 113, 0.30)', label: '41 m et +' },
];

const getDepthStyle = (detailOrProps) => {
  let val = 18;
  if (typeof detailOrProps === 'number') {
    val = detailOrProps;
  } else if (typeof detailOrProps === 'string') {
    const parsed = parseFloat(detailOrProps);
    if (!isNaN(parsed)) val = parsed;
  }
  const match = DEPTH_COLOR_SCALE.find((item) => val <= item.max) || DEPTH_COLOR_SCALE[1];
  return {
    strokeColor: match.stroke,
    fillColor: match.fill,
    icon: '🌊',
    label: `Profondeur (${val} m)`,
  };
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
  markerRefSetter,
}) => {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    setTracksViewChanges(true);
    const timer = setTimeout(() => {
      setTracksViewChanges(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [isSelected, marker.profondeur, marker.center?.latitude, marker.center?.longitude]);

  return (
    <Marker
      ref={markerRefSetter}
      coordinate={marker.center}
      title={marker.calloutTitle}
      description={marker.displayDesc || undefined}
      tracksViewChanges={tracksViewChanges}
      zIndex={isSelected ? 30 : (marker.isDepthPoint ? 12 : 15)}
      onPress={onPress}
    >
      {marker.isDepthPoint ? (
        <View style={[
          styles.depthPointBadge,
          isSelected && styles.depthPointBadgeSelected,
          { borderColor: marker.depthColor || '#38BDF8' }
        ]}>
          <Text style={[styles.depthPointText, isSelected && styles.depthPointTextSelected]}>
            {marker.profondeur}
          </Text>
        </View>
      ) : marker.hasBadge ? (
        <View style={styles.poiBadge}>
          <Text style={styles.poiBadgeText}>{marker.displayIcon}</Text>
        </View>
      ) : (
        <View style={{ width: 1, height: 1, opacity: 0 }} />
      )}
    </Marker>
  );
});

const TopoSiteMap = ({ topo, spot }) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  // Mode d'affichage dans la carte réduite : 'map' (carte satellite) ou 'plan' (image schéma)
  const [viewMode, setViewMode] = useState('map');
  const [fullscreenMap, setFullscreenMap] = useState(false);
  const [fullscreenPlan, setFullscreenPlan] = useState(false);
  // Zone sélectionnée (au clic sur polygone ou marqueur)
  const [selectedZone, setSelectedZone] = useState(null);
  // Affichage replié/déplié de la légende bathymétrique en haut à droite
  const [legendExpanded, setLegendExpanded] = useState(true);

  // Références vers les marqueurs pour ouvrir leur bulle de texte (Callout)
  const cardMarkerRefs = useRef({});
  const fullscreenMarkerRefs = useRef({});
  const cardMapRef = useRef(null);
  const fullscreenMapRef = useRef(null);

  // Conversion des polygones GeoJSON & filtrage des marqueurs
  const geojsonPolygons = useMemo(() => {
    if (!topo?.geojson?.features) return { rawPolygons: [], markers: [] };

    const rawPolygons = [];
    const markers = [];

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
          markerId,
          type,
          detail,
          coords,
          center: { latitude: centerLat, longitude: centerLng },
          style,
          properties: feature.properties || {},
        };

        rawPolygons.push(polyObj);

        // Titre brut pour l'encadré du bas, et titre avec icône pour la bulle native
        const rawTitle =
          feature.properties?.titre ||
          feature.properties?.nom ||
          feature.properties?.name ||
          style.label;
        const calloutTitle = style.icon ? `${style.icon} ${rawTitle}` : rawTitle;

        // On associe un marqueur à chaque polygone (badge visible pour les POIs, invisible pour les entrées et zones de profondeur)
        markers.push({
          id: markerId,
          polyId,
          type,
          center: { latitude: centerLat, longitude: centerLng },
          displayIcon: style.icon,
          titleText: rawTitle,
          calloutTitle,
          displayDesc: getFeatureDescription(feature.properties),
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
            calloutTitle: `Profondeur : ${depthVal} m`,
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
          const calloutTitle = style.icon ? `${style.icon} ${rawTitle}` : rawTitle;

          markers.push({
            id: markerId,
            polyId: markerId,
            type,
            center,
            displayIcon: style.icon,
            titleText: rawTitle,
            calloutTitle,
            displayDesc: getFeatureDescription(feature.properties),
            hasBadge: true,
          });
        }
      }
    });

    return { rawPolygons, markers };
  }, [topo?.geojson]);

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
      } catch (e) {}
    }
  }, [targetCoords?.latitude, targetCoords?.longitude, mapDelta]);

  // Animation fluide de la caméra plein écran à l'ouverture du modal
  useEffect(() => {
    if (fullscreenMap && fullscreenMapRef.current && targetCoords) {
      try {
        fullscreenMapRef.current.animateToRegion({
          latitude: targetCoords.latitude,
          longitude: targetCoords.longitude,
          latitudeDelta: mapDelta,
          longitudeDelta: mapDelta,
        }, 300);
      } catch (e) {}
    }
  }, [fullscreenMap, targetCoords?.latitude, targetCoords?.longitude]);

  const imageSource = useMemo(() => {
    if (!topo?.plan_image) return null;
    return TOPO_LOCAL_ASSETS[topo.plan_image]
      ? TOPO_LOCAL_ASSETS[topo.plan_image]
      : { uri: topo.plan_image };
  }, [topo?.plan_image]);

  if (!topo && !spot) return null;

  const siteTitle = topo?.titre || spot?.nom || 'Site de plongée';
  const siteSubTitle = topo?.sous_titre || spot?.localite || '';

  // Sélection d'une zone (clic polygone) : met à jour l'état et OUVRE la bulle du marqueur
  const handleSelectPoly = (poly, isFullscreen = false) => {
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

    const refMap = isFullscreen ? fullscreenMarkerRefs.current : cardMarkerRefs.current;
    const markerRef = refMap[poly.id] || refMap[poly.markerId];
    if (markerRef) {
      setTimeout(() => {
        try {
          markerRef.showCallout();
        } catch (e) {
          console.log('Erreur showCallout poly:', e);
        }
      }, 50);
    }
  };

  // Sélection d'un marqueur (clic icône) : met à jour l'état et s'assure que la bulle s'ouvre
  const handleSelectMarker = (marker, isFullscreen = false) => {
    setSelectedZone({
      id: marker.polyId,
      icon: marker.displayIcon,
      title: marker.titleText,
      description: marker.displayDesc || '',
    });

    const refMap = isFullscreen ? fullscreenMarkerRefs.current : cardMarkerRefs.current;
    const markerRef = refMap[marker.id] || refMap[marker.polyId];
    if (markerRef) {
      setTimeout(() => {
        try {
          markerRef.showCallout();
        } catch (e) {
          console.log('Erreur showCallout marker:', e);
        }
      }, 50);
    }
  };

  // Fermeture des bulles et désélection au clic sur la carte vide
  const handleMapPress = (isFullscreen = false) => {
    setSelectedZone(null);
    const refMap = isFullscreen ? fullscreenMarkerRefs.current : cardMarkerRefs.current;
    Object.values(refMap).forEach((ref) => {
      try {
        ref?.hideCallout();
      } catch (e) {}
    });
  };

  // Fermeture manuelle de l'encadré d'info
  const handleCloseZone = () => {
    setSelectedZone(null);
    Object.values(cardMarkerRefs.current).forEach((ref) => {
      try { ref?.hideCallout(); } catch (e) {}
    });
    Object.values(fullscreenMarkerRefs.current).forEach((ref) => {
      try { ref?.hideCallout(); } catch (e) {}
    });
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
          title={siteTitle}
          description={siteSubTitle}
        />
      )}

      {/* Dessin des contours de toutes les zones GeoJSON cliquables */}
      {geojsonPolygons.rawPolygons.map((poly) => {
        const isSelected = selectedZone?.id === poly.id;
        return (
          <Polygon
            key={isFullscreen ? `fs-poly-${poly.id}` : `card-poly-${poly.id}`}
            coordinates={poly.coords}
            strokeColor={isSelected ? '#FFFFFF' : poly.style.strokeColor}
            fillColor={isSelected ? poly.style.fillColor.replace('0.25', '0.6').replace('0.4', '0.7') : poly.style.fillColor}
            strokeWidth={isSelected ? 3 : 2}
            lineDashPattern={poly.style.lineDashPattern}
            tappable={true}
            onPress={() => handleSelectPoly(poly, isFullscreen)}
          />
        );
      })}

      {/* Rendu des marqueurs avec référence pour pouvoir ouvrir leur bulle */}
      {geojsonPolygons.markers.map((marker) => {
        const isSelected = selectedZone?.id === marker.polyId;
        return (
          <CustomTopoMarker
            key={isFullscreen ? `fs-marker-${marker.id}-${topo?.id}` : `card-marker-${marker.id}-${topo?.id}`}
            marker={marker}
            isSelected={isSelected}
            isFullscreen={isFullscreen}
            styles={styles}
            onPress={() => handleSelectMarker(marker, isFullscreen)}
            markerRefSetter={(ref) => {
              if (ref) {
                const refMap = isFullscreen ? fullscreenMarkerRefs.current : cardMarkerRefs.current;
                refMap[marker.polyId] = ref;
                refMap[marker.id] = ref;
              }
            }}
          />
        );
      })}
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
        <Text style={styles.depthLegendToggle}>{legendExpanded ? '▴' : '▾'}</Text>
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
                  } catch (e) {}
                }
              }}
              scrollEnabled={true}
              zoomEnabled={true}
              pitchEnabled={false}
              rotateEnabled={false}
              showsZoomControls={false}
              toolbarEnabled={false}
              onPress={() => handleMapPress(false)}
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
              onPress={handleCloseZone}
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
              ref={fullscreenMapRef}
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
              onPress={() => handleMapPress(true)}
            >
              {renderMapElements(true)}
            </MapView>

            {/* ── Légende des profondeurs en haut à droite en plein écran ── */}
            {renderDepthLegend(true)}

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
                    onPress={handleCloseZone}
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  poiBadgeText: {
    fontSize: 15,
    textAlign: 'center',
  },
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
    top: 14,
    right: 14,
    paddingHorizontal: 10,
    paddingVertical: 7,
    minWidth: 98,
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
});

export default TopoSiteMap;
