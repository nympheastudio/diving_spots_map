/**
 * topoUtils.js - Fonctions pures utilitaires pour le module topo
 *
 * Ce module extrait la logique pure de TopoSiteMap.js et DivingDataService.js
 * afin de la rendre testable independamment (sans simulateur, sans React Native).
 */

// Palette de couleurs pour les zones de profondeur (isobathes / bathymetrie)
export const DEPTH_COLOR_SCALE = [
  { max: 10, stroke: '#38BDF8', fill: 'rgba(56, 189, 248, 0.25)', label: '1 a 10 m' },
  { max: 20, stroke: '#4ADE80', fill: 'rgba(74, 222, 128, 0.25)', label: '11 a 20 m' },
  { max: 30, stroke: '#FB923C', fill: 'rgba(251, 146, 60, 0.30)', label: '21 a 30 m' },
  { max: 40, stroke: '#C084FC', fill: 'rgba(192, 132, 252, 0.30)', label: '31 a 40 m' },
  { max: Infinity, stroke: '#F87171', fill: 'rgba(248, 113, 113, 0.30)', label: '41 m et +' },
];

/**
 * Renvoie le style (strokeColor, fillColor, icon, label) correspondant a une profondeur.
 */
export const getDepthStyle = (detailOrProps) => {
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
    icon: 'X',
    label: `Profondeur (${val} m)`,
  };
};

/**
 * Convertit une chaîne de coordonnées GPS nautiques en latitude / longitude décimales.
 *
 * Formats attendus et supportés :
 * 1. DMM (Degrés Minutes Décimales - standard nautique / SHOM recommandé) :
 *    - Format avec point/virgule : "43°12.830'N - 5°19.511'E" ou "43°12,830'N - 5°19,511'E"
 *    - Format nautique legacy :    "43°12'830\"N - 5°19'511\"E" (3 chiffres = millièmes de minute)
 *    Formule : degrés + (minutes + millièmes / 1000) / 60
 *
 * 2. DMS (Degrés Minutes Secondes d'arc) :
 *    - "43°16'12\"N - 5°17'49\"E" (secondes d'arc de 0 à 59)
 *    Formule : degrés + minutes / 60 + secondes / 3600
 *
 * 3. Degrés décimaux directs :
 *    - "43.2138, 5.3252" ou "43.2138°N - 5.3252°E"
 *
 * Directions cardinales gérées :
 * - Nord (N) : positif
 * - Sud (S) : négatif
 * - Est (E) : positif
 * - Ouest (W ou O en français) : négatif
 *
 * @param {string} gpsStr - Chaîne de coordonnées GPS brutes
 * @param {number} [defaultLat=43.27] - Latitude de repli si parsing impossible
 * @param {number} [defaultLng=5.28] - Longitude de repli si parsing impossible
 * @returns {{ latitude: number, longitude: number }} Coordonnées décimales
 */
export const parseGpsCoords = (gpsStr, defaultLat, defaultLng) => {
  const fallbackLat = typeof defaultLat === 'number' && !isNaN(defaultLat) ? defaultLat : 43.27;
  const fallbackLng = typeof defaultLng === 'number' && !isNaN(defaultLng) ? defaultLng : 5.28;

  if (!gpsStr || typeof gpsStr !== 'string') {
    return { latitude: fallbackLat, longitude: fallbackLng };
  }

  try {
    const trimmed = gpsStr.trim();

    // 1. Cas coordonnées décimales directes : "43.2138, 5.3252" ou "43.2138 - 5.3252"
    const directDecimalMatch = trimmed.match(/^([-+]?\d+(?:\.\d+)?)\s*[,;\/]\s*([-+]?\d+(?:\.\d+)?)$/);
    if (directDecimalMatch) {
      const lat = parseFloat(directDecimalMatch[1]);
      const lng = parseFloat(directDecimalMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { latitude: lat, longitude: lng };
      }
    }

    // 2. Découpage en 2 composantes (latitude et longitude)
    const parts = trimmed.split(/[-–—/]/).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 2) {
      const parseComponent = (str) => {
        // A. Format DMM avec point/virgule : "43°12.830'N" ou "43° 12,830' N"
        const dmmMatch = str.match(/^(\d+)[°\s]+(\d+)[.,](\d+)['′]?\s*([NSEWOU])$/i);
        if (dmmMatch) {
          const deg = parseFloat(dmmMatch[1]);
          const min = parseFloat(dmmMatch[2]);
          const fracStr = dmmMatch[3];
          const minDecimal = min + parseFloat(`0.${fracStr}`);
          let val = deg + minDecimal / 60;
          const dir = dmmMatch[4].toUpperCase();
          if (dir === 'S' || dir === 'W' || dir === 'O') val = -val;
          return val;
        }

        // B. Format nautique avec apostrophe : "43°12'830\"N" ou "43°16'20\"N" ou "43°16'N"
        // Note: conformément à la spécification historique du projet topo, la valeur après l'apostrophe
        // représente les décimales de minute (centièmes ou millièmes), et non des secondes d'arc.
        const dmsMatch = str.match(/^(\d+)[°\s]+(\d+)['′](?:\s*(\d+(?:[.,]\d+)?)[\"″])?\s*([NSEWOU])$/i);
        if (dmsMatch) {
          const deg = parseFloat(dmsMatch[1]);
          const min = parseFloat(dmsMatch[2]);
          const fracStr = dmsMatch[3] ? dmsMatch[3].replace(',', '.') : null;

          let val;
          if (!fracStr) {
            val = deg + min / 60;
          } else {
            const minDecimal = parseFloat(`${min}.${fracStr}`);
            val = deg + minDecimal / 60;
          }

          const dir = dmsMatch[4].toUpperCase();
          if (dir === 'S' || dir === 'W' || dir === 'O') val = -val;
          return val;
        }

        // C. Format décimal avec cardinal : "43.2138°N" ou "43.2138 N"
        const decCardMatch = str.match(/^(\d+(?:[.,]\d+)?)[°\s]*([NSEWOU])$/i);
        if (decCardMatch) {
          let val = parseFloat(decCardMatch[1].replace(',', '.'));
          const dir = decCardMatch[2].toUpperCase();
          if (dir === 'S' || dir === 'W' || dir === 'O') val = -val;
          return val;
        }

        return null;
      };

      const lat = parseComponent(parts[0]);
      const lng = parseComponent(parts[1]);
      if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
        return { latitude: lat, longitude: lng };
      }
    }
  } catch (e) {
    // silencieux, retour aux valeurs par défaut
  }

  return { latitude: fallbackLat, longitude: fallbackLng };
};

/**
 * Calcule la distance en metres entre deux points GPS (Haversine).
 * Identique a l'implementation de TopoSiteMap.js.
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Variante Haversine de DivingDataService.js (retourne des km).
 */
export const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Lissage angulaire adaptatif circulaire (gere le passage 359->0).
 * Identique a l'implementation de TopoSiteMap.js.
 */
export const smoothAngle = (prev, current, baseAlpha = 0.35) => {
  let diff = (current - prev + 360) % 360;
  if (diff > 180) diff -= 360;
  const absDiff = Math.abs(diff);
  const alpha = absDiff > 20 ? 0.92 : absDiff > 8 ? 0.65 : baseAlpha;
  let result = (prev + diff * alpha) % 360;
  if (result < 0) result += 360;
  return result;
};

/**
 * Formate la distance de facon lisible.
 */
export const formatDistance = (meters) => {
  if (meters === null || meters === undefined || isNaN(meters)) return null;
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

/**
 * Calcule et formate la distance en ligne droite jusqu'a un objet selectionne sur le topo.
 * Ne s'applique pas aux zones de profondeur (retourne null).
 *
 * @param {{ latitude: number, longitude: number }} [userCoords] - Coordonnees de l'utilisateur
 * @param {{ latitude: number, longitude: number }} [objectCenter] - Coordonnees du centre de l'objet
 * @param {boolean} [isDepthZone=false] - Indique si l'element est une zone de profondeur (isobathe / sonde)
 * @returns {string|null} Distance formatee (ex: "45 m", "1.2 km") ou null si inapplicable
 */
export const getStraightLineDistance = (userCoords, objectCenter, isDepthZone = false) => {
  if (Boolean(isDepthZone)) return null;
  if (!userCoords || !objectCenter) return null;

  const userLat = Number(userCoords.latitude);
  const userLng = Number(userCoords.longitude);
  const objLat = Number(objectCenter.latitude);
  const objLng = Number(objectCenter.longitude);

  if (isNaN(userLat) || isNaN(userLng) || isNaN(objLat) || isNaN(objLng)) {
    return null;
  }

  const dist = calculateDistance(userLat, userLng, objLat, objLng);
  return formatDistance(dist);
};

