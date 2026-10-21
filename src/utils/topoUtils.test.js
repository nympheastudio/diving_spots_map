/**
 * Tests unitaires pour les fonctions pures du module topo.
 * Aucun simulateur requis - logique pure uniquement.
 */

import {
  DEPTH_COLOR_SCALE,
  getDepthStyle,
  parseGpsCoords,
  calculateDistance,
  calculateDistanceKm,
  smoothAngle,
  formatDistance,
  getStraightLineDistance,
  getBearingToPoint,
  getRelativeBearing,
} from './topoUtils';

describe('navigation vers un repère sélectionné', () => {
  const user = { latitude: 43, longitude: 5 };

  it('calcule le cap du point sélectionné et change quand la cible change', () => {
    expect(getBearingToPoint(user, { latitude: 44, longitude: 5 })).toBeCloseTo(0, 5);
    expect(getBearingToPoint(user, { latitude: 43, longitude: 6 })).toBeCloseTo(89.66, 0);
  });

  it('oriente la cible par rapport au téléphone, y compris au passage du nord', () => {
    expect(getRelativeBearing(10, 350)).toBe(20);
    expect(getRelativeBearing(350, 10)).toBe(340);
    expect(getRelativeBearing(90, 90)).toBe(0);
  });

  it('ne crée pas de cap sans position ou orientation valide', () => {
    expect(getBearingToPoint(null, user)).toBeNull();
    expect(getRelativeBearing(90, null)).toBeNull();
  });
});

// =============================================================================
// DEPTH_COLOR_SCALE & getDepthStyle
// =============================================================================

describe('DEPTH_COLOR_SCALE', () => {
  it('contient 5 entrees dans le bon ordre', () => {
    expect(DEPTH_COLOR_SCALE).toHaveLength(5);
    expect(DEPTH_COLOR_SCALE[0].max).toBe(10);
    expect(DEPTH_COLOR_SCALE[4].max).toBe(Infinity);
  });

  it('chaque entree a les cles attendues', () => {
    DEPTH_COLOR_SCALE.forEach((entry) => {
      expect(entry).toHaveProperty('max');
      expect(entry).toHaveProperty('stroke');
      expect(entry).toHaveProperty('fill');
      expect(entry).toHaveProperty('label');
    });
  });
});

describe('getDepthStyle', () => {
  it('5 m -> couleur bleu (1-10 m)', () => {
    const style = getDepthStyle(5);
    expect(style.strokeColor).toBe('#38BDF8');
  });

  it('10 m -> couleur bleu (borne incluse)', () => {
    const style = getDepthStyle(10);
    expect(style.strokeColor).toBe('#38BDF8');
  });

  it('11 m -> couleur vert (11-20 m)', () => {
    const style = getDepthStyle(11);
    expect(style.strokeColor).toBe('#4ADE80');
  });

  it('20 m -> couleur vert (borne incluse)', () => {
    const style = getDepthStyle(20);
    expect(style.strokeColor).toBe('#4ADE80');
  });

  it('25 m -> couleur orange (21-30 m)', () => {
    const style = getDepthStyle(25);
    expect(style.strokeColor).toBe('#FB923C');
  });

  it('35 m -> couleur violet (31-40 m)', () => {
    const style = getDepthStyle(35);
    expect(style.strokeColor).toBe('#C084FC');
  });

  it('50 m -> couleur rouge (41+ m)', () => {
    const style = getDepthStyle(50);
    expect(style.strokeColor).toBe('#F87171');
  });

  it('accepte une chaine numerique', () => {
    const style = getDepthStyle('15');
    expect(style.strokeColor).toBe('#4ADE80');
  });

  it('chaine non numerique -> valeur par defaut (18 m -> vert)', () => {
    const style = getDepthStyle('invalid');
    expect(style.strokeColor).toBe('#4ADE80');
  });
});

// =============================================================================
// parseGpsCoords
// =============================================================================

describe('parseGpsCoords', () => {
  it('null -> coordonnees par defaut', () => {
    const result = parseGpsCoords(null, 43.5, 5.5);
    expect(result).toEqual({ latitude: 43.5, longitude: 5.5 });
  });

  it('undefined -> coordonnees par defaut', () => {
    const result = parseGpsCoords(undefined, 43.5, 5.5);
    expect(result).toEqual({ latitude: 43.5, longitude: 5.5 });
  });

  it('chaine vide -> coordonnees par defaut', () => {
    const result = parseGpsCoords('', 43.0, 5.0);
    expect(result).toEqual({ latitude: 43.0, longitude: 5.0 });
  });

  it('pas de defaultLat/Lng -> valeurs hardcodees 43.27 / 5.28', () => {
    const result = parseGpsCoords(null);
    expect(result.latitude).toBeCloseTo(43.27);
    expect(result.longitude).toBeCloseTo(5.28);
  });

  // Format present dans diving_spots.json pour Riou :
  // "43°10'598\"N - 5°22'748\"E"
  it('format DMS reel Riou: "43deg10\'598"N - 5deg22\'748"E"', () => {
    const raw = "43\u00b010'598\"N - 5\u00b022'748\"E";
    const result = parseGpsCoords(raw, 0, 0);
    // 43 + 10.598/60 = 43.17663...
    expect(result.latitude).toBeCloseTo(43.1766, 3);
    // 5 + 22.748/60 = 5.37913...
    expect(result.longitude).toBeCloseTo(5.3791, 3);
  });

  it('direction Ouest (W) donne longitude negative', () => {
    const raw = "43\u00b010'000\"N - 2\u00b030'000\"W";
    const result = parseGpsCoords(raw, 0, 0);
    expect(result.latitude).toBeGreaterThan(0);
    expect(result.longitude).toBeLessThan(0);
  });

  it('direction Sud (S) donne latitude negative', () => {
    const raw = "10\u00b000'000\"S - 5\u00b000'000\"E";
    const result = parseGpsCoords(raw, 0, 0);
    expect(result.latitude).toBeLessThan(0);
    expect(result.longitude).toBeGreaterThan(0);
  });

  it('direction Ouest en francais (O) donne longitude negative', () => {
    const raw = "43\u00b010'000\"N - 2\u00b030'000\"O";
    const result = parseGpsCoords(raw, 0, 0);
    expect(result.longitude).toBeLessThan(0);
  });

  it('format sans secondes -> tombe en fallback si regex ne matche pas', () => {
    // Le regex exige deg°min'[sec]"dir - sans sec ni guillemet ca peut echouer
    const raw = "43\u00b017N - 5\u00b017E";
    const result = parseGpsCoords(raw, 43.5, 5.5);
    // Le regex ne trouve pas de match -> retour au fallback
    expect(result).toEqual({ latitude: 43.5, longitude: 5.5 });
  });

  it('format DMM avec point decimal standard', () => {
    const raw = "43\u00b012.830'N - 5\u00b019.511'E";
    const result = parseGpsCoords(raw);
    expect(result.latitude).toBeCloseTo(43.2138, 3);
    expect(result.longitude).toBeCloseTo(5.3252, 3);
  });

  it('format DMM avec virgule et directions Sud / Ouest', () => {
    const raw = "43\u00b012,830'S - 5\u00b019,511'O";
    const result = parseGpsCoords(raw);
    expect(result.latitude).toBeCloseTo(-43.2138, 3);
    expect(result.longitude).toBeCloseTo(-5.3252, 3);
  });

  it('format DMM avec direction W', () => {
    const raw = "43\u00b012.830'N - 5\u00b019.511'W";
    const result = parseGpsCoords(raw);
    expect(result.longitude).toBeCloseTo(-5.3252, 3);
  });

  it('format DMM sans fraction de minute (juste deg°min\'dir)', () => {
    const raw = "43\u00b016'N - 5\u00b017'E";
    const result = parseGpsCoords(raw);
    expect(result.latitude).toBeCloseTo(43 + 16 / 60, 4);
    expect(result.longitude).toBeCloseTo(5 + 17 / 60, 4);
  });

  it('format coordonnees decimales directes', () => {
    const raw = "43.2138, 5.3252";
    const result = parseGpsCoords(raw);
    expect(result.latitude).toBeCloseTo(43.2138, 4);
    expect(result.longitude).toBeCloseTo(5.3252, 4);
  });

  it('format decimal avec cardinal (°N, °E, °S, °O)', () => {
    const raw1 = "43.2138\u00b0N - 5.3252\u00b0E";
    const res1 = parseGpsCoords(raw1);
    expect(res1.latitude).toBeCloseTo(43.2138, 4);
    expect(res1.longitude).toBeCloseTo(5.3252, 4);

    const raw2 = "43.2138\u00b0S - 5.3252\u00b0O";
    const res2 = parseGpsCoords(raw2);
    expect(res2.latitude).toBeCloseTo(-43.2138, 4);
    expect(res2.longitude).toBeCloseTo(-5.3252, 4);
  });

  it('type non-chaine ou invalide -> valeurs par defaut', () => {
    expect(parseGpsCoords(12345, 43.1, 5.1)).toEqual({ latitude: 43.1, longitude: 5.1 });
    expect(parseGpsCoords({}, 43.1, 5.1)).toEqual({ latitude: 43.1, longitude: 5.1 });
  });
});

// =============================================================================
// Haversine - calculateDistance (metres, TopoSiteMap.js)
// =============================================================================

describe('calculateDistance (metres)', () => {
  it('meme point -> 0 m', () => {
    expect(calculateDistance(43.0, 5.0, 43.0, 5.0)).toBe(0);
  });

  it('1 degre de latitude ~ 111 km', () => {
    const d = calculateDistance(0, 0, 1, 0);
    expect(d / 1000).toBeCloseTo(111.195, 0);
  });

  it('symetrie : d(A,B) == d(B,A)', () => {
    const d1 = calculateDistance(43.0, 5.0, 44.0, 6.0);
    const d2 = calculateDistance(44.0, 6.0, 43.0, 5.0);
    expect(d1).toBeCloseTo(d2, 5);
  });

  it('retourne un nombre positif entre deux points distincts', () => {
    const d = calculateDistance(43.27, 5.28, 43.17, 5.38);
    expect(d).toBeGreaterThan(0);
  });

  it('distance Marseille <-> Frioul ~ 9-10 km', () => {
    // Marseille Vieux-Port ~ 43.295°N, 5.374°E
    // Iles du Frioul ~ 43.278°N, 5.299°E
    const d = calculateDistance(43.295, 5.374, 43.278, 5.299);
    expect(d / 1000).toBeGreaterThan(4);
    expect(d / 1000).toBeLessThan(12);
  });
});

// =============================================================================
// Haversine - calculateDistanceKm (km, DivingDataService.js)
// =============================================================================

describe('calculateDistanceKm (km)', () => {
  it('meme point -> 0 km', () => {
    expect(calculateDistanceKm(43.0, 5.0, 43.0, 5.0)).toBe(0);
  });

  it('1 degre de latitude ~ 111 km', () => {
    const d = calculateDistanceKm(0, 0, 1, 0);
    expect(d).toBeCloseTo(111.195, 0);
  });

  it('symetrie : d(A,B) == d(B,A)', () => {
    const d1 = calculateDistanceKm(43.0, 5.0, 44.0, 6.0);
    const d2 = calculateDistanceKm(44.0, 6.0, 43.0, 5.0);
    expect(d1).toBeCloseTo(d2, 5);
  });

  it('coherence avec calculateDistance (meme valeur en unites differentes)', () => {
    const dM = calculateDistance(43.0, 5.0, 44.0, 6.0);
    const dKm = calculateDistanceKm(43.0, 5.0, 44.0, 6.0);
    expect(dM / 1000).toBeCloseTo(dKm, 2);
  });
});

// =============================================================================
// smoothAngle
// =============================================================================

describe('smoothAngle', () => {
  it('premier appel (prev=0, current=0) -> 0', () => {
    expect(smoothAngle(0, 0)).toBe(0);
  });

  it('petit mouvement (< 8 deg) -> alpha de base 0.35', () => {
    // prev=100, current=104 -> diff=4 (< 8) -> alpha=0.35
    const result = smoothAngle(100, 104);
    const expected = (100 + 4 * 0.35) % 360;
    expect(result).toBeCloseTo(expected, 5);
  });

  it('mouvement moyen (8-20 deg) -> alpha=0.65', () => {
    // prev=100, current=115 -> diff=15 -> alpha=0.65
    const result = smoothAngle(100, 115);
    const expected = (100 + 15 * 0.65) % 360;
    expect(result).toBeCloseTo(expected, 5);
  });

  it('grand mouvement (> 20 deg) -> alpha=0.92', () => {
    // prev=100, current=130 -> diff=30 -> alpha=0.92
    const result = smoothAngle(100, 130);
    const expected = (100 + 30 * 0.92) % 360;
    expect(result).toBeCloseTo(expected, 5);
  });

  it('passage 359 -> 0 (sens horaire) : pas de saut', () => {
    // diff = (0 - 359 + 360) % 360 = 1 -> petit mouvement
    const result = smoothAngle(359, 0);
    // Doit rester proche de 359 (pas sauter a 0)
    expect(result).toBeGreaterThan(350);
    // Et ne pas etre negatif
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('passage 0 -> 359 (sens anti-horaire) : pas de saut', () => {
    // diff = (359 - 0 + 360) % 360 = 359 -> 359 > 180 => diff = 359-360 = -1
    // result = (0 + (-1) * 0.35) = -0.35 -> +360 = 359.65
    const result = smoothAngle(0, 359);
    // Doit etre a 359.65 (normalise dans [0, 360[, a 0.35 deg de 0)
    expect(result).toBeCloseTo(359.65, 2);
    expect(result).toBeGreaterThan(350);
    expect(result).toBeLessThan(360);
  });

  it('normalisation : le resultat est toujours dans [0, 360[', () => {
    const angles = [
      [350, 10],
      [5, 350],
      [0, 180],
      [180, 0],
      [90, 270],
      [270, 90],
    ];
    angles.forEach(([prev, current]) => {
      const result = smoothAngle(prev, current);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(360);
    });
  });

  it('alpha personnalise est respecte pour les petits mouvements', () => {
    const result = smoothAngle(100, 102, 0.5);
    // diff=2 < 8 -> alpha=0.5
    const expected = (100 + 2 * 0.5) % 360;
    expect(result).toBeCloseTo(expected, 5);
  });
});

// =============================================================================
// formatDistance
// =============================================================================

describe('formatDistance', () => {
  it('null -> null', () => {
    expect(formatDistance(null)).toBeNull();
  });

  it('undefined -> null', () => {
    expect(formatDistance(undefined)).toBeNull();
  });

  it('NaN -> null', () => {
    expect(formatDistance(NaN)).toBeNull();
  });

  it('distance < 30 m -> toujours la distance en metres', () => {
    expect(formatDistance(20)).toBe('20 m');
    expect(formatDistance(0)).toBe('0 m');
    expect(formatDistance(12.4)).toBe('12 m');
  });

  it('30 m -> metres', () => {
    expect(formatDistance(30)).toBe('30 m');
  });

  it('999 m -> metres', () => {
    expect(formatDistance(999)).toBe('999 m');
  });

  it('1000 m -> km', () => {
    expect(formatDistance(1000)).toBe('1.0 km');
  });

  it('5500 m -> 5.5 km', () => {
    expect(formatDistance(5500)).toBe('5.5 km');
  });
});

// =============================================================================
// getStraightLineDistance
// =============================================================================

describe('getStraightLineDistance', () => {
  const user = { latitude: 43.27, longitude: 5.28 };
  const rock = { latitude: 43.271, longitude: 5.281 }; // ~138 m de distance

  it('retourne null si isDepthZone est true (zone de profondeur)', () => {
    expect(getStraightLineDistance(user, rock, true)).toBeNull();
  });

  it('retourne null si isDepthZone est une valeur truthy', () => {
    expect(getStraightLineDistance(user, rock, 1)).toBeNull();
    expect(getStraightLineDistance(user, rock, 'yes')).toBeNull();
  });

  it('retourne null si userCoords est null ou absent', () => {
    expect(getStraightLineDistance(null, rock, false)).toBeNull();
    expect(getStraightLineDistance(undefined, rock, false)).toBeNull();
    expect(getStraightLineDistance({}, rock, false)).toBeNull();
  });

  it('retourne null si objectCenter est null ou absent', () => {
    expect(getStraightLineDistance(user, null, false)).toBeNull();
    expect(getStraightLineDistance(user, undefined, false)).toBeNull();
    expect(getStraightLineDistance(user, {}, false)).toBeNull();
  });

  it('retourne null si les coordonnees contiennent NaN', () => {
    expect(getStraightLineDistance({ latitude: 'abc', longitude: 5.28 }, rock)).toBeNull();
    expect(getStraightLineDistance(user, { latitude: 43.27, longitude: 'xyz' })).toBeNull();
  });

  it('calcule la distance en metres pour un objet a proximite immediate (< 30 m)', () => {
    // Même position -> 0 m
    expect(getStraightLineDistance(user, user, false)).toBe('0 m');
  });

  it('calcule la distance en metres pour un objet proche (rocher, grotte)', () => {
    const dist = getStraightLineDistance(user, rock, false);
    expect(dist).toMatch(/^\d+ m$/);
    const meters = parseInt(dist, 10);
    expect(meters).toBeGreaterThan(50);
    expect(meters).toBeLessThan(300);
  });

  it('calcule la distance en km pour un objet a plus d\'1 km', () => {
    // ~11 km
    const farPoi = { latitude: 43.37, longitude: 5.28 };
    const dist = getStraightLineDistance(user, farPoi, false);
    expect(dist).toMatch(/^\d+\.\d+ km$/);
  });

  it('accepte des coordonnees transmises sous forme de chaines numeriques', () => {
    const userStr = { latitude: '43.27', longitude: '5.28' };
    const rockStr = { latitude: '43.271', longitude: '5.281' };
    const dist = getStraightLineDistance(userStr, rockStr, false);
    expect(dist).not.toBeNull();
    expect(dist).toMatch(/^\d+ m$/);
  });
});

