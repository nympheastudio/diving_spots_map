/**
 * Exemples d'Utilisation du Système de Cartographie
 * Diving Spots Map - Méditerranée
 */

// ============================================================================
// 1. UTILISER LE SERVICE DE DONNÉES
// ============================================================================

import DivingDataService from './src/services/DivingDataService';

// Exemple 1: Récupérer tous les spots
async function getAllSpots() {
  try {
    const spots = await DivingDataService.getAllDivingSpots();
    console.log(`${spots.length} spots chargés`);
    // Output: 13 spots chargés
    
    spots.forEach(spot => {
      console.log(`- ${spot.nom} (${spot.difficulte})`);
    });
  } catch (error) {
    console.error('Erreur:', error);
  }
}

// Exemple 2: Chercher un spot par ID
async function getSpotDetails(spotId) {
  const spot = await DivingDataService.getDivingSpotById(1);
  
  if (spot) {
    console.log(`
      Nom: ${spot.nom}
      Localité: ${spot.localite}
      Profondeur: ${spot.profondeur_min}-${spot.profondeur_max}m
      Difficulté: ${spot.difficulte}
      Prix: €${spot.prix_journee}
    `);
  }
}

// Exemple 3: Recherche texte
async function searchSpots() {
  // Chercher tous les spots à Marseille
  let results = await DivingDataService.searchDivingSpots('Marseille');
  console.log(`${results.length} spots trouvés à Marseille`);
  
  // Chercher les épaves
  results = await DivingDataService.searchDivingSpots('Épave');
  console.log(`${results.length} épaves trouvées`);
  
  // Recherche insensible aux accents
  results = await DivingDataService.searchDivingSpots('Ile');
  console.log(`${results.length} îles trouvées (sans accent)`);
}

// Exemple 4: Filtrer par critères
async function filterSpots() {
  // Spots Beginner accessibles
  let filtered = await DivingDataService.filterDivingSpots({
    difficulty: ['Beginner']
  });
  console.log(`${filtered.length} spots pour débutants`);
  
  // Spots intermédiaires peu profonds
  filtered = await DivingDataService.filterDivingSpots({
    difficulty: ['Intermediate'],
    maxDepth: 40,
    minVisibility: 35
  });
  console.log(`${filtered.length} spots intermédiaires peu profonds`);
  
  // Tous les types d'épaves et grottes
  filtered = await DivingDataService.filterDivingSpots({
    type: ['Épave', 'Grotte']
  });
  console.log(`${filtered.length} épaves et grottes`);
}

// Exemple 5: Spots proches
async function getNearbySpots() {
  // Position actuelle (exemple: Marseille port)
  const userLat = 43.2965;
  const userLng = 5.3698;
  const radius = 50; // km
  
  const nearby = await DivingDataService.getNearbySpots(
    userLat, userLng, radius
  );
  
  console.log(`${nearby.length} spots à moins de ${radius}km:`);
  nearby.forEach(spot => {
    const km = (spot.distance / 1000).toFixed(1);
    console.log(`- ${spot.nom}: ${km}km`);
  });
}

// ============================================================================
// 2. UTILISER LES COMPOSANTS DANS DES ÉCRANS
// ============================================================================

import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import DivingMap from './src/components/DivingMap';
import SearchBar from './src/components/SearchBar';
import ListView from './src/components/ListView';
import DetailSheet from './src/components/DetailSheet';

// Écran 1: Carte Simple
export function MapScreen() {
  const [spots, setSpots] = useState([]);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    // Charger les spots au montage
    loadSpots();
    getLocation();
  }, []);

  async function loadSpots() {
    const data = await DivingDataService.getAllDivingSpots();
    setSpots(data);
  }

  async function getLocation() {
    // À implémenter avec expo-location
    setUserLocation({ latitude: 43.2965, longitude: 5.3698 });
  }

  return (
    <View style={{ flex: 1 }}>
      <SearchBar onSpotSelect={setSelectedSpot} />
      <DivingMap
        spots={spots}
        currentMarkers={spots}
        location={userLocation}
        markerSelected={selectedSpot}
        setMarkerSelected={setSelectedSpot}
        onSpotPress={setSelectedSpot}
      />
      <DetailSheet
        spot={selectedSpot}
        isVisible={!!selectedSpot}
        onClose={() => setSelectedSpot(null)}
      />
    </View>
  );
}

// Écran 2: Liste Seule
export function ListScreen() {
  const [spots, setSpots] = useState([]);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    loadSpots();
  }, []);

  async function loadSpots() {
    const data = await DivingDataService.getAllDivingSpots();
    setSpots(data);
  }

  return (
    <View style={{ flex: 1 }}>
      <ListView
        spots={spots}
        userLocation={userLocation}
        onSpotPress={setSelectedSpot}
      />
      <DetailSheet
        spot={selectedSpot}
        isVisible={!!selectedSpot}
        onClose={() => setSelectedSpot(null)}
      />
    </View>
  );
}

// Écran 3: Avec Filtres
export function FilteredScreen() {
  const [spots, setSpots] = useState([]);
  const [filteredSpots, setFilteredSpots] = useState([]);
  const [filters, setFilters] = useState({});

  useEffect(() => {
    loadSpots();
  }, []);

  async function loadSpots() {
    const data = await DivingDataService.getAllDivingSpots();
    setSpots(data);
    setFilteredSpots(data);
  }

  async function applyFilters(newFilters) {
    setFilters(newFilters);
    const filtered = await DivingDataService.filterDivingSpots(newFilters);
    setFilteredSpots(filtered);
  }

  return (
    <View style={{ flex: 1 }}>
      <Text>Filtres: {Object.keys(filters).length}</Text>
      <ListView spots={filteredSpots} />
    </View>
  );
}

// ============================================================================
// 3. PATTERNS D'INTÉGRATION
// ============================================================================

// Pattern 1: Sync Automatique avec Redux (si vous utilisez Redux)
/**
export const fetchDivingSpots = () => async (dispatch) => {
  dispatch({ type: 'SPOTS_LOADING' });
  try {
    const spots = await DivingDataService.getAllDivingSpots();
    dispatch({ type: 'SPOTS_LOADED', payload: spots });
  } catch (error) {
    dispatch({ type: 'SPOTS_ERROR', payload: error });
  }
};

export const searchSpots = (query) => async (dispatch) => {
  try {
    const results = await DivingDataService.searchDivingSpots(query);
    dispatch({ type: 'SEARCH_RESULTS', payload: results });
  } catch (error) {
    dispatch({ type: 'SEARCH_ERROR', payload: error });
  }
};
*/

// Pattern 2: Hook Personnalisé
/**
function useDivingSpots() {
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadSpots = async () => {
      setLoading(true);
      try {
        const data = await DivingDataService.getAllDivingSpots();
        setSpots(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    loadSpots();
  }, []);

  return { spots, loading, error };
}
*/

// Pattern 3: Recherche Debounced
/**
import debounce from 'lodash/debounce';

const [results, setResults] = useState([]);
const [query, setQuery] = useState('');

const handleSearch = debounce(async (text) => {
  if (text.length > 2) {
    const results = await DivingDataService.searchDivingSpots(text);
    setResults(results);
  }
}, 300);

const handleChangeText = (text) => {
  setQuery(text);
  handleSearch(text);
};
*/

// ============================================================================
// 4. DONNÉES STRUCTURÉES - EXEMPLES DE SPOTS
// ============================================================================

/**
Exemple 1: Spot pour Débutants
{
  id: 6,
  nom: "Île de Bendor",
  description: "Petite île avec récifs artificiels et une riche biodiversité",
  localite: "Bandol",
  code_postal: "83150",
  latitude: 43.1489,
  longitude: 5.7455,
  profondeur_max: 42,
  profondeur_min: 6,
  difficulte: "Beginner",
  type_site: "Îlot / Récif artificiel",
  faune: ["Daurade royale", "Loup", "Sar", "Labridés", "Poulpe"],
  flore: ["Posidonie", "Gorgones", "Anémones", "Algues"],
  courant: "Faible",
  visibilite: 35,
  meilleure_saison: "Avril à Novembre",
  photo: "https://upload.wikimedia.org/wikipedia/commons/...",
  conditions_acces: "Accessible aux débutants, accès par bateau",
  prix_journee: 48,
  capacite_plongeurs: 12
}

Exemple 2: Spot Avancé (Épave)
{
  id: 4,
  nom: "Épave du Rubis",
  description: "Sous-marin coulé en 1940, site historique et archéologique fascinant",
  localite: "Toulon",
  code_postal: "83000",
  latitude: 43.0889,
  longitude: 5.9297,
  profondeur_max: 68,
  profondeur_min: 40,
  difficulte: "Advanced",
  type_site: "Épave",
  faune: ["Congre", "Sériole", "Labridés", "Poissons de roche"],
  flore: ["Anémones", "Éponges", "Coraux"],
  courant: "Modéré à fort",
  visibilite: 32,
  meilleure_saison: "Juillet à Septembre",
  photo: "https://upload.wikimedia.org/wikipedia/commons/...",
  conditions_acces: "Réservé aux plongeurs brevetés Advanced",
  prix_journee: 85,
  capacite_plongeurs: 6
}
*/

// ============================================================================
// 5. TESTS UNITAIRES (EXEMPLES)
// ============================================================================

/**
import { render, screen, fireEvent } from '@testing-library/react-native';
import SearchBar from './src/components/SearchBar';

describe('SearchBar Component', () => {
  it('should search and display results', async () => {
    const mockOnSelect = jest.fn();
    render(<SearchBar onSpotSelect={mockOnSelect} />);
    
    const input = screen.getByPlaceholderText('Rechercher un spot...');
    fireEvent.changeText(input, 'Marseille');
    
    // Attendre les résultats
    await screen.findByText(/Parc National des Calanques/);
    expect(screen.getAllByText(/Marseille/)).toBeTruthy();
  });
});

describe('DivingDataService', () => {
  it('should fetch all spots', async () => {
    const spots = await DivingDataService.getAllDivingSpots();
    expect(spots.length).toBe(13);
    expect(spots[0]).toHaveProperty('nom');
    expect(spots[0]).toHaveProperty('latitude');
  });

  it('should search and normalize accents', async () => {
    const results = await DivingDataService.searchDivingSpots('iles');
    expect(results.length).toBeGreaterThan(0);
    // Should match "Îles d'Hyères"
  });

  it('should filter by difficulty', async () => {
    const beginner = await DivingDataService.filterDivingSpots({
      difficulty: ['Beginner']
    });
    expect(beginner.length).toBe(2); // 2 spots beginner
    beginner.forEach(spot => {
      expect(spot.difficulte).toBe('Beginner');
    });
  });
});
*/

// ============================================================================
// 6. MIGRATION DEPUIS L'API RÉELLE
// ============================================================================

/**
// Quand vous aurez une vraie API, remplacez DivingDataService:

// Avant (Local JSON):
const spots = await DivingDataService.getAllDivingSpots();

// Après (API Réelle):
async function getAllDivingSpots() {
  const response = await fetch('https://api.example.com/diving-spots');
  const data = await response.json();
  return data.spots;
}

// Le reste du code reste inchangé!
// Les composants ne connaissent pas la source des données
*/

export default {
  getAllSpots,
  getSpotDetails,
  searchSpots,
  filterSpots,
  getNearbySpots,
};
