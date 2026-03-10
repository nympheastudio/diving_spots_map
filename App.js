/**
 * App Principal - Coordonne tous les écrans et composants
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';

// Services
import DivingDataService from './src/services/DivingDataService';

// Composants
import SearchBar from './src/components/SearchBar';
import DivingMap from './src/components/DivingMapSimple';
import ListView from './src/components/ListView';
import DetailSheet from './src/components/DetailSheet';
import FilterSheet from './src/components/FilterSheet';

export default function App() {
  // États principaux
  const [allSpots, setAllSpots] = useState([]);
  const [currentMarkers, setCurrentMarkers] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [viewMode, setViewMode] = useState('map'); // 'map' ou 'list'
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [region, setRegion] = useState({
    latitude: 43.2965,
    longitude: 5.3698,
    latitudeDelta: 1.5,
    longitudeDelta: 1.5,
  });
  const [detailVisible, setDetailVisible] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);

  // Charger les données au démarrage
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Demander la permission de localisation
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }

        // Charger les spots de plongée
        const spots = await DivingDataService.getAllDivingSpots();
        setAllSpots(spots);
        setCurrentMarkers(spots);
      } catch (error) {
        console.log('Error initializing app:', error);
        Alert.alert('Erreur', 'Impossible de charger les données');
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Filtrer les spots
  const handleApplyFilters = useCallback(async (newFilters) => {
    setFilters(newFilters);
    setIsLoading(true);
    try {
      const filtered = await DivingDataService.filterDivingSpots(newFilters);
      setCurrentMarkers(filtered);
    } catch (error) {
      console.log('Error filtering spots:', error);
      Alert.alert('Erreur', 'Impossible de filtrer les spots');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sélectionner un spot
  const handleSpotPress = useCallback((spot) => {
    setSelectedSpot(spot);
    setDetailVisible(true);
  }, []);

  // Sauvegarder les marqueurs visibles (pour la synchronisation de la carte)
  const handleSaveCurrentMarkers = useCallback((markers) => {
    setCurrentMarkers(markers);
  }, []);

  // Fermer le détail et revenir à la recherche
  const handleCloseDetail = useCallback(() => {
    setDetailVisible(false);
    setSelectedSpot(null);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContent}>
        {/* Contenu principal */}
        {viewMode === 'map' ? (
          <DivingMap
            spots={allSpots}
            currentMarkers={currentMarkers}
            saveCurrentMarkers={handleSaveCurrentMarkers}
            location={userLocation}
            markerSelected={selectedSpot}
            setMarkerSelected={setSelectedSpot}
            onSpotPress={handleSpotPress}
            region={region}
            setRegion={setRegion}
            filters={filters}
          />
        ) : (
          <ListView
            spots={currentMarkers}
            userLocation={userLocation}
            onSpotPress={handleSpotPress}
          />
        )}

        {/* Search Bar flottante par-dessus la carte */}
        <View style={styles.searchOverlay}>
          <SearchBar
            onSpotSelect={handleSpotPress}
            onClose={() => {}}
          />
        </View>
      </View>

      {/* Bottom Tab Navigation */}
      <View style={styles.bottomNav}>
        <TabNavButton
          icon="🗺️"
          label="Carte"
          active={viewMode === 'map'}
          onPress={() => setViewMode('map')}
        />
        <TabNavButton
          icon="≡"
          label="Liste"
          active={viewMode === 'list'}
          onPress={() => setViewMode('list')}
        />
        <TabNavButton
          icon="⚙️"
          label="Filtres"
          active={false}
          onPress={() => setFilterVisible(true)}
        />
      </View>

      {/* Detail Sheet */}
      <DetailSheet
        spot={selectedSpot}
        isVisible={detailVisible}
        onClose={handleCloseDetail}
      />

      {/* Filter Sheet */}
      <FilterSheet
        isVisible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApplyFilters={handleApplyFilters}
      />
    </SafeAreaView>
  );
}

// Composant TabNavButton
const TabNavButton = ({ icon, label, active, onPress }) => (
  <TouchableOpacity
    style={[styles.tabButton, active && styles.tabButtonActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={styles.tabIcon}>{icon}</Text>
    <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

// Import TouchableOpacity
import { TouchableOpacity } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  mainContent: {
    flex: 1,
    zIndex: 1,
  },
  searchOverlay: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    paddingBottom: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  tabButtonActive: {
    borderTopWidth: 3,
    borderTopColor: '#4A90E2',
  },
  tabIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#4A90E2',
    fontWeight: '600',
  },
});
