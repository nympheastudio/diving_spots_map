/**
 * Test de fiabilisation et documentation métier : Gestion des coordonnées GPS topos vs lieux
 *
 * Règle métier :
 * - Un lieu de type "Archipel" (ex: Riou, Frioul) est positionné sur son île principale ou son point de repère.
 * - Chaque spot de plongée (topo) rattaché à cet archipel possède ses propres coordonnées GPS
 *   précises (qui ne sont pas égales au point central du lieu qui les regroupe).
 * - Pour un spot ponctuel unique (ex: Site test Jean Althen), lieu et topo coïncident (< 50 m).
 * - Pour chaque topo ayant un tracé GeoJSON (ex: Tiboulen de Maïre, La grotte à corail, Pomègues),
 *   les coordonnées GPS de parseGpsCoords concordent parfaitement avec les tracés bathymétriques.
 */

import spotsData from '../../data/diving_spots.json';
import { parseGpsCoords, calculateDistance } from './topoUtils';

describe('Vérification et fiabilisation des coordonnées GPS des topos et des lieux', () => {
  it('chaque topo de diving_spots.json a des coordonnées GPS valides et décodées sans erreur', () => {
    spotsData.spots.forEach((spot) => {
      expect(spot.topos).toBeDefined();
      expect(spot.topos.length).toBeGreaterThan(0);

      spot.topos.forEach((topo) => {
        expect(topo.coordonnees_gps).toBeDefined();
        expect(typeof topo.coordonnees_gps).toBe('string');
        expect(topo.coordonnees_gps.trim().length).toBeGreaterThan(0);

        // Fallback impossible pour prouver que parseGpsCoords réussit
        const coords = parseGpsCoords(topo.coordonnees_gps, -999, -999);
        expect(coords.latitude).not.toBe(-999);
        expect(coords.longitude).not.toBe(-999);
        expect(isNaN(coords.latitude)).toBe(false);
        expect(isNaN(coords.longitude)).toBe(false);

        // Plages valides GPS terrestres
        expect(coords.latitude).toBeGreaterThan(40);
        expect(coords.latitude).toBeLessThan(45);
        expect(coords.longitude).toBeGreaterThan(4);
        expect(coords.longitude).toBeLessThan(8);

        // Chaque topo est bien dans le rayon géographique de son lieu / archipel (< 8 km)
        const distFromSpot = calculateDistance(
          spot.latitude,
          spot.longitude,
          coords.latitude,
          coords.longitude
        );
        expect(distFromSpot).toBeLessThan(8000);
      });
    });
  });

  it('Riou : le lieu est sur l\'île principale et les topos ont leurs propres coordonnées distinctes', () => {
    const riouSpot = spotsData.spots.find((s) => s.id === 21);
    expect(riouSpot).toBeDefined();
    // Le lieu est centré sur l'île principale de Riou
    expect(riouSpot.latitude).toBeCloseTo(43.1762, 4);
    expect(riouSpot.longitude).toBeCloseTo(5.3857, 4);

    // Tiboulen de Maïre est sur l'île Maïre (au nord-ouest de l'archipel)
    const tiboulenTopo = riouSpot.topos.find((t) => t.id === 'tiboulen-de-maire');
    const tiboulenCoords = parseGpsCoords(tiboulenTopo.coordonnees_gps);
    expect(tiboulenCoords.latitude).toBeCloseTo(43.2138, 3);
    expect(tiboulenCoords.longitude).toBeCloseTo(5.3252, 3);

    // La grotte à corail est également sur l'île Maïre (secteur sud)
    const grotteTopo = riouSpot.topos.find((t) => t.id === 'la-grotte-a-corail');
    const grotteCoords = parseGpsCoords(grotteTopo.coordonnees_gps);
    expect(grotteCoords.latitude).toBeCloseTo(43.2106, 3);
    expect(grotteCoords.longitude).toBeCloseTo(5.3328, 3);

    // Les deux topos de l'île Maïre sont proches l'un de l'autre (< 1 km)
    const distEntreTopos = calculateDistance(
      tiboulenCoords.latitude,
      tiboulenCoords.longitude,
      grotteCoords.latitude,
      grotteCoords.longitude
    );
    expect(distEntreTopos).toBeLessThan(1000);

    // Et ils sont distants du lieu central (île de Riou principale) d'environ 6 km
    const distRiouMaire = calculateDistance(
      riouSpot.latitude,
      riouSpot.longitude,
      tiboulenCoords.latitude,
      tiboulenCoords.longitude
    );
    expect(distRiouMaire).toBeGreaterThan(5000);
    expect(distRiouMaire).toBeLessThan(7500);
  });

  it('Frioul : le lieu est sur l\'archipel et regroupe plusieurs topos sur différentes îles', () => {
    const frioulSpot = spotsData.spots.find((s) => s.id === 1);
    expect(frioulSpot).toBeDefined();

    // Pomègues, Ratonneau (Pierre à oeil), Cap Caveau, Junker 88
    expect(frioulSpot.topos.length).toBeGreaterThanOrEqual(4);

    frioulSpot.topos.forEach((topo) => {
      const coords = parseGpsCoords(topo.coordonnees_gps);
      const dist = calculateDistance(frioulSpot.latitude, frioulSpot.longitude, coords.latitude, coords.longitude);
      // Tous les topos du Frioul se trouvent dans un rayon de 4 km autour du Frioul
      expect(dist).toBeLessThan(4000);
    });
  });

  it('Site ponctuel (Avignon Jean Althen) : le topo coïncide avec le lieu (< 50 m)', () => {
    const testSpot = spotsData.spots.find((s) => s.id === 22);
    expect(testSpot).toBeDefined();

    const topo = testSpot.topos[0];
    const coords = parseGpsCoords(topo.coordonnees_gps);
    const distance = calculateDistance(testSpot.latitude, testSpot.longitude, coords.latitude, coords.longitude);

    expect(distance).toBeLessThan(50);
  });

  it('les coordonnées GPS concordent avec les polygones GeoJSON des topos cartographiés', () => {
    spotsData.spots.forEach((spot) => {
      spot.topos.forEach((topo) => {
        if (topo.geojson?.features?.length > 0) {
          const firstFeature = topo.geojson.features[0];
          let geoLat = null;
          let geoLng = null;

          if (firstFeature.geometry?.type === 'Polygon') {
            const firstCoord = firstFeature.geometry.coordinates[0][0];
            geoLng = firstCoord[0];
            geoLat = firstCoord[1];
          } else if (firstFeature.geometry?.type === 'Point') {
            geoLng = firstFeature.geometry.coordinates[0];
            geoLat = firstFeature.geometry.coordinates[1];
          }

          if (geoLat !== null && geoLng !== null) {
            const parsedGps = parseGpsCoords(topo.coordonnees_gps);
            const dist = calculateDistance(parsedGps.latitude, parsedGps.longitude, geoLat, geoLng);
            // Les coordonnées GPS du topo et son tracé GeoJSON sont cohérents à < 500 m
            expect(dist).toBeLessThan(500);
          }
        }
      });
    });
  });
});
