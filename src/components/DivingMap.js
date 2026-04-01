/**
 * Composant Map principal - Gestion de la carte avec clustering
 * Adapté du système ADM pour les spots de plongée
 */

import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
  useMemo,
} from 'react';
import PropTypes from 'prop-types';
import { View, Dimensions, Keyboard, TouchableOpacity, Text, Image } from 'react-native';
import MapView from 'react-native-map-clustering';

// Services
import DivingDataService from '../services/DivingDataService';

// Composants
import DivingMarker from './DivingMarker';
import DivingCluster from './DivingCluster';
import DivingCallout from './DivingCallout';
import MapButtons from './MapButtons';

const DivingMap = ({
  spots = [],
  currentMarkers,
  saveCurrentMarkers,
  location,
  markerSelected = null,
  setMarkerSelected,
  onSpotPress,
  region,
  setRegion,
  filters = {},
}) => {
  const mapRef = useRef(null);
  const [mapLayout, setMapLayout] = useState(null);
  const [calloutLayout, setCalloutLayout] = useState(null);
  const [mapPoints, setMapPoints] = useState(null);
  const [screenSize, reloadLayout] = useState({});
  const [mapOpacity, setMapOpacity] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  let isMount = true;

  // Centrer la map sur un marker sélectionné
  const moveToMarker = () => {
    if (!mapRef.current || !markerSelected) {
      return;
    }

    const map = mapRef.current;
    const markerCoordinate = {
      latitude: markerSelected.latitude,
      longitude: markerSelected.longitude,
    };

    const calculYPosition = (y) => (
      y - 30 - ((calloutLayout?.height ?? 0 + (calloutLayout?.y ?? 0)) - (mapLayout?.height ?? 0 / 2))
    );

    map.pointForCoordinate(markerCoordinate)
      .then((point) => map.coordinateForPoint({ x: point.x, y: calculYPosition(point.y) }))
      .then((newCoords) => map.setCamera({ center: { ...newCoords } }))
      .catch((error) => console.log('Error moving to marker:', error));
  };

  // Naviguer vers une région
  const goToRegion = (newLocation) => {
    const newRegion = {
      ...newLocation,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
    if (mapRef.current) {
      mapRef.current.animateToRegion(newRegion);
    }
  };

  // Filtrer les markers visibles sur la map
  const filterHostMarkers = async () => {
    try {
      const mapBoundaries = await mapRef.current.getMapBoundaries();
      if (isMount) {
        // Filtrer les spots visibles dans les limites de la map
        const filteredMarkers = spots.filter(spot => {
          return (
            spot.latitude >= mapBoundaries.southWest.latitude &&
            spot.latitude <= mapBoundaries.northEast.latitude &&
            spot.longitude >= mapBoundaries.southWest.longitude &&
            spot.longitude <= mapBoundaries.northEast.longitude
          );
        });
        setMapPoints(mapBoundaries);
        saveCurrentMarkers(filteredMarkers);
      }
    } catch (error) {
      console.log('Error filtering markers:', error);
    }
  };

  // Gestion du clic sur la map
  const handleMapPress = () => {
    Keyboard.dismiss();
    if (markerSelected) {
      setMarkerSelected(null);
    }
  };

  // Gestion du déplacement de la map
  const handlePanDrag = () => {
    if (markerSelected) {
      setMarkerSelected(null);
    }
  };

  // Setup layout sur rotation
  useEffect(() => {
    function handleRotate() {
      const {
        width: deviceWidth,
        height: deviceHeight,
      } = Dimensions.get('window');

      reloadLayout({
        width: deviceWidth,
        height: deviceHeight,
      });
    }

    handleRotate();
    const unsubscribe = Dimensions.addEventListener('change', handleRotate);

    return () => {
      isMount = false;
      unsubscribe?.remove?.();
    };
  }, []);

  // Centrer sur le marker sélectionné
  useEffect(() => {
    if (markerSelected && mapRef.current) {
      moveToMarker();
    }
  }, [markerSelected, calloutLayout, mapLayout]);

  // Filtrer les markers quand la région change
  useEffect(() => {
    if (mapRef.current && currentMarkers) {
      filterHostMarkers();
    }
  }, [region]);

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={{ 
          flex: 1, 
          opacity: mapOpacity || 1,
          width: Dimensions.get('window').width,
          height: Dimensions.get('window').height,
        }}
        initialRegion={{
          latitude: 43.2965,
          longitude: 5.3698,
          latitudeDelta: 1.5,
          longitudeDelta: 1.5,
        }}
        showsZoomControls={false}
        onPress={handleMapPress}
        onPanDrag={handlePanDrag}
        onRegionChangeComplete={(newRegion) => setRegion(newRegion)}
        clusterColor="#FF6B6B"
        clusterTextColor="#FFFFFF"
        clusterBorderColor="#C92A2A"
        clusterBorderWidth={2}
        renderMarker={(coordinate, idx, onPress) => (
          <DivingMarker
            key={idx}
            coordinate={coordinate}
            spot={coordinate}
            onPress={onPress}
            isSelected={markerSelected?.id === coordinate.id}
          />
        )}
        renderCluster={(cluster) => (
          <DivingCluster
            coordinate={cluster.coordinate}
            onPress={cluster.onPress}
            pointCount={cluster.pointCount}
          />
        )}
      >
        {markerSelected && (
          <DivingCallout
            spot={markerSelected}
            setLayout={setCalloutLayout}
            onPress={() => onSpotPress?.(markerSelected)}
          />
        )}
      </MapView>

      <MapButtons
        onMyLocation={() => {
          if (location) {
            goToRegion(location);
          }
        }}
        onListView={() => {
          // Basculer vers la vue liste
        }}
      />

      {isLoading && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.3)',
        }}>
          <Text>Chargement...</Text>
        </View>
      )}
    </View>
  );
};

DivingMap.propTypes = {
  spots: PropTypes.array,
  currentMarkers: PropTypes.array,
  saveCurrentMarkers: PropTypes.func,
  location: PropTypes.object,
  markerSelected: PropTypes.object,
  setMarkerSelected: PropTypes.func,
  onSpotPress: PropTypes.func,
  region: PropTypes.object,
  setRegion: PropTypes.func,
  filters: PropTypes.object,
};

DivingMap.defaultProps = {
  spots: [],
  currentMarkers: [],
  saveCurrentMarkers: () => {},
  location: null,
  markerSelected: null,
  setMarkerSelected: () => {},
  onSpotPress: () => {},
  filters: {},
};

export default DivingMap;
