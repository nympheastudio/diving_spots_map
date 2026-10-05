/**
 * Test de fiabilisation et non-régression : Bug 1 - Dérive des coordonnées GPS
 *
 * Vérifie que pour chaque spot de diving_spots.json, les coordonnées nautiques
 * de son topo de référence correspondent à la latitude/longitude du spot (tolérance < 50 m),
 * et que chaque topo présent dans le fichier possède des coordonnées valides et cohérentes
 * avec sa zone géographique (résolution du bug de dérive de 5-6 km sur Riou et 375 m sur Frioul).
 */

import spotsData from '../../data/diving_spots.json';
import { parseGpsCoords, calculateDistance } from './topoUtils';

describe('Bug 1 - Dérive des coordonnées GPS topos vs spots', () => {
  it('chaque spot a son topo principal cohérent avec ses coordonnées (< 50 m)', () => {
    spotsData.spots.forEach((spot) => {
      expect(spot.topos).toBeDefined();
      expect(spot.topos.length).toBeGreaterThan(0);

      // Le premier topo est le topo principal du site
      const mainTopo = spot.topos[0];
      const parsedCoords = parseGpsCoords(mainTopo.coordonnees_gps);

      const distanceMeters = calculateDistance(
        spot.latitude,
        spot.longitude,
        parsedCoords.latitude,
        parsedCoords.longitude
      );

      // La distance entre le spot et son topo principal doit être inférieure à 50 mètres
      expect(distanceMeters).toBeLessThan(50);
    });
  });

  it('Riou : la dérive historique de 5-6 km est corrigée (< 50 m)', () => {
    const riouSpot = spotsData.spots.find((s) => s.id === 21);
    expect(riouSpot).toBeDefined();

    const mainTopo = riouSpot.topos.find((t) => t.id === 'tiboulen-de-maire');
    expect(mainTopo).toBeDefined();

    const coords = parseGpsCoords(mainTopo.coordonnees_gps);
    const distance = calculateDistance(riouSpot.latitude, riouSpot.longitude, coords.latitude, coords.longitude);

    // Avant correction, la distance était de 6 448 mètres (dérive de 6,4 km)
    expect(distance).toBeLessThan(50);
  });

  it('Frioul : la dérive historique sur Pomègues est corrigée (< 50 m)', () => {
    const frioulSpot = spotsData.spots.find((s) => s.id === 1);
    expect(frioulSpot).toBeDefined();

    const pomeguesTopo = frioulSpot.topos.find((t) => t.id === 'frioul-pomegues');
    expect(pomeguesTopo).toBeDefined();

    const coords = parseGpsCoords(pomeguesTopo.coordonnees_gps);
    const distance = calculateDistance(frioulSpot.latitude, frioulSpot.longitude, coords.latitude, coords.longitude);

    // Avant correction, la distance était de 375 mètres
    expect(distance).toBeLessThan(50);
  });

  it('Site Test Avignon (Rue Jean Althen) : coordonnées conformes (< 50 m)', () => {
    const testSpot = spotsData.spots.find((s) => s.id === 22);
    expect(testSpot).toBeDefined();

    const topo = testSpot.topos[0];
    const coords = parseGpsCoords(topo.coordonnees_gps);
    const distance = calculateDistance(testSpot.latitude, testSpot.longitude, coords.latitude, coords.longitude);

    expect(distance).toBeLessThan(50);
  });

  it('chaque topo de diving_spots.json a des coordonnées GPS valides et parsables sans fallback', () => {
    spotsData.spots.forEach((spot) => {
      (spot.topos || []).forEach((topo) => {
        expect(topo.coordonnees_gps).toBeDefined();
        expect(typeof topo.coordonnees_gps).toBe('string');
        expect(topo.coordonnees_gps.length).toBeGreaterThan(0);

        // On passe des valeurs de fallback impossibles pour s'assurer que le parser n'échoue pas
        const parsed = parseGpsCoords(topo.coordonnees_gps, -999, -999);
        expect(parsed.latitude).not.toBe(-999);
        expect(parsed.longitude).not.toBe(-999);

        // Plages valides GPS terrestres
        expect(parsed.latitude).toBeGreaterThan(-90);
        expect(parsed.latitude).toBeLessThan(90);
        expect(parsed.longitude).toBeGreaterThan(-180);
        expect(parsed.longitude).toBeLessThan(180);

        // Chaque topo reste dans le périmètre de son spot / archipel (< 4 km)
        const distFromSpot = calculateDistance(
          spot.latitude,
          spot.longitude,
          parsed.latitude,
          parsed.longitude
        );
        expect(distFromSpot).toBeLessThan(4000);
      });
    });
  });
});
