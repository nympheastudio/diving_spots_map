/**
 * Service pour gérer les données des spots de plongée
 * Simule une API mais utilise les données locales en JSON
 */

import drivingSpots from '../../data/diving_spots.json';

const defaultPhoto = drivingSpots.default_photo;
const defaultGallery = drivingSpots.default_photos_fond_marin;

// Banque d'images fallback pour les spots sans médias dédiés (proto)
const fallbackSpotPhotos = [
  'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Calanques_de_Marseille_3.jpg/1280px-Calanques_de_Marseille_3.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Porquerolles_2007.jpg/1280px-Porquerolles_2007.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Bandol_areal.jpg/1280px-Bandol_areal.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Levant_Francais.jpg/1280px-Levant_Francais.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Cap_Lardier.jpg/1280px-Cap_Lardier.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Saint_Raphael_vue_mer.jpg/1280px-Saint_Raphael_vue_mer.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Saint_Tropez_beach.jpg/1280px-Saint_Tropez_beach.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Cannes_harbour.jpg/1280px-Cannes_harbour.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Antibes_vue.jpg/1280px-Antibes_vue.jpg',
];

const fallbackUnderwaterGallery = [
  'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200',
  'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200',
  'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=1200',
  'https://images.unsplash.com/photo-1546026423-cc4642628d2b?w=1200',
  'https://images.unsplash.com/photo-1535908339838-e79cba118f78?w=1200',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Calanques_de_Marseille_3.jpg/1280px-Calanques_de_Marseille_3.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Porquerolles_2007.jpg/1280px-Porquerolles_2007.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Bandol_areal.jpg/1280px-Bandol_areal.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Cap_Lardier.jpg/1280px-Cap_Lardier.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Antibes_vue.jpg/1280px-Antibes_vue.jpg',
];

const createSeededImage = (seed, width = 1200, height = 800) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/${width}/${height}`;

const uniqUrls = (urls = []) => urls.filter((url, idx, arr) => url && arr.indexOf(url) === idx);

const buildGeneratedGallery = (spotId = 0) => [
  createSeededImage(`diving-gallery-${spotId}-1`),
  createSeededImage(`diving-gallery-${spotId}-2`),
  createSeededImage(`diving-gallery-${spotId}-3`),
];

const pickFallbackPhoto = (spotId = 0) =>
  fallbackSpotPhotos[Math.abs(spotId) % fallbackSpotPhotos.length] || defaultPhoto;

const buildFallbackGallery = (spotId = 0) => {
  const start = Math.abs(spotId) % fallbackUnderwaterGallery.length;
  return [0, 1, 2].map(
    (offset) => fallbackUnderwaterGallery[(start + offset) % fallbackUnderwaterGallery.length]
  );
};

const applyDefaultPhotos = (spot) => ({
  ...spot,
  photo:
    spot.photo ||
    createSeededImage(`diving-cover-${spot.id}`, 1400, 900) ||
    pickFallbackPhoto(spot.id) ||
    defaultPhoto,
  photos_fond_marin: uniqUrls([
    ...buildGeneratedGallery(spot.id),
    ...(spot.photos_fond_marin || []),
    ...((spot.photos_fond_marin && spot.photos_fond_marin.length > 0
      ? []
      : buildFallbackGallery(spot.id)) || []),
    ...(defaultGallery || []),
  ]).slice(0, 6),
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
