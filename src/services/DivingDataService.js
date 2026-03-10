/**
 * Service pour gérer les données des spots de plongée
 * Simule une API mais utilise les données locales en JSON
 */

import drivingSpots from '../../data/diving_spots.json';

const defaultPhoto = drivingSpots.default_photo;
const defaultGallery = drivingSpots.default_photos_fond_marin;

const applyDefaultPhotos = (spot) => ({
  ...spot,
  photo: defaultPhoto || spot.photo,
  photos_fond_marin: defaultGallery || spot.photos_fond_marin,
});

const getSpotsWithDefaults = () => drivingSpots.spots.map(applyDefaultPhotos);

/**
 * Récupère tous les spots de plongée
 */
export const getAllDivingSpots = async () => {
  // Simulation d'un délai réseau
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(getSpotsWithDefaults());
    }, 300);
  });
};

/**
 * Récupère un spot par ID
 */
export const getDivingSpotById = async (id) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const spot = getSpotsWithDefaults().find(s => s.id === id);
      resolve(spot || null);
    }, 200);
  });
};

/**
 * Recherche des spots selon un texte
 */
export const searchDivingSpots = async (query = '') => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const normalizedQuery = query.toLowerCase().normalize('NFD').replace(/[^a-z0-9\s-]/g, '').trim();
      
      if (!normalizedQuery) {
        resolve([]);
        return;
      }

      const results = getSpotsWithDefaults().filter(spot => {
        const searchableFields = [
          spot.nom,
          spot.localite,
          spot.code_postal,
          spot.type_site,
          spot.difficulte,
          `${spot.code_postal} ${spot.localite}`.trim(),
        ]
          .filter(Boolean)
          .map(field => field.toLowerCase().normalize('NFD').replace(/[^a-z0-9\s-]/g, ''));

        return searchableFields.some(field => field.includes(normalizedQuery));
      });

      resolve(results.slice(0, 20));
    }, 250);
  });
};

/**
 * Filtre les spots selon les critères
 */
export const filterDivingSpots = async (filters = {}) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      let filtered = [...getSpotsWithDefaults()];

      // Filtre par difficulté
      if (filters.difficulty && filters.difficulty.length > 0) {
        filtered = filtered.filter(spot => 
          filters.difficulty.includes(spot.difficulte)
        );
      }

      // Filtre par type de site
      if (filters.type && filters.type.length > 0) {
        filtered = filtered.filter(spot => 
          filters.type.includes(spot.type_site)
        );
      }

      // Filtre par profondeur max
      if (filters.maxDepth) {
        filtered = filtered.filter(spot => 
          spot.profondeur_max <= filters.maxDepth
        );
      }

      // Filtre par profondeur min
      if (filters.minDepth) {
        filtered = filtered.filter(spot => 
          spot.profondeur_min >= filters.minDepth
        );
      }

      // Filtre par visibilité
      if (filters.minVisibility) {
        filtered = filtered.filter(spot => 
          spot.visibilite >= filters.minVisibility
        );
      }

      resolve(filtered);
    }, 200);
  });
};

/**
 * Récupère les spots à proximité d'une localisation
 */
export const getNearbySpots = async (latitude, longitude, radiusKm = 50) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const R = 6371; // Rayon de la Terre en km

      const nearby = getSpotsWithDefaults()
        .map(spot => {
          const dLat = (spot.latitude - latitude) * Math.PI / 180;
          const dLon = (spot.longitude - longitude) * Math.PI / 180;
          const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(latitude * Math.PI / 180) * Math.cos(spot.latitude * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distance = R * c;

          return { ...spot, distance };
        })
        .filter(spot => spot.distance <= radiusKm)
        .sort((a, b) => a.distance - b.distance);

      resolve(nearby);
    }, 250);
  });
};

export default {
  getAllDivingSpots,
  getDivingSpotById,
  searchDivingSpots,
  filterDivingSpots,
  getNearbySpots,
};
