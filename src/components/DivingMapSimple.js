/**
 * Composant Map Simple avec OpenStreetMap via WebView + Leaflet
 * Carte libre sans clé API nécessaire
 */

import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { View, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const DivingMapSimple = ({
  spots = [],
  markerSelected = null,
  onSpotPress,
  region,
  location,
}) => {
  const webViewRef = useRef(null);

  if (!spots || spots.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: "center", marginTop: 50, color: "#666" }}>
          Chargement de la carte...
        </Text>
      </View>
    );
  }

  // Générer le HTML avec Leaflet embarqué
  const generateMapHTML = () => {
    const markers = spots.filter(s => s && s.latitude && s.longitude).map((spot) => ({
      id: spot.id,
      lat: spot.latitude,
      lng: spot.longitude,
      nom: spot.nom,
      localite: spot.localite || '',
      profondeur: `${spot.profondeur_min || 0}-${spot.profondeur_max || 0}m`,
      difficulte: spot.difficulte || '',
      visibilite: spot.visibilite || '',
    }));

    const centerLat = region?.latitude || 43.2965;
    const centerLng = region?.longitude || 5.3698;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { margin: 0; padding: 0; }
    #map { width: 100%; height: 100vh; }
    .popup-title { 
      font-size: 16px; 
      font-weight: bold; 
      color: #4A90E2; 
      margin-bottom: 8px; 
    }
    .popup-info { 
      font-size: 13px; 
      color: #666; 
      margin: 4px 0; 
    }
    .popup-button {
      margin-top: 10px;
      padding: 8px 16px;
      background: #4A90E2;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      width: 100%;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const map = L.map('map', { zoomControl: false }).setView([${centerLat}, ${centerLng}], 9);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 18,
    }).addTo(map);
    
    const markers = ${JSON.stringify(markers)};
    const markerObjects = {};
    
    markers.forEach(spot => {
      const marker = L.marker([spot.lat, spot.lng], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: '<div style="background: #4A90E2; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>',
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        })
      }).addTo(map);
      
      const popupContent = \`
        <div style="min-width: 200px;">
          <div class="popup-title">\${spot.nom}</div>
          <div class="popup-info">\${spot.localite}</div>
          <div class="popup-info"><strong>Profondeur:</strong> \${spot.profondeur}</div>
          <div class="popup-info"><strong>Difficulté:</strong> \${spot.difficulte}</div>
          <div class="popup-info"><strong>Visibilité:</strong> \${spot.visibilite}</div>
          <button class="popup-button" onclick="window.ReactNativeWebView.postMessage('\${spot.id}')">
            Voir les détails
          </button>
        </div>
      \`;
      
      marker.bindPopup(popupContent);
      markerObjects[spot.id] = marker;
    });
    
    window.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'centerOnMarker' && data.spotId) {
          const marker = markerObjects[data.spotId];
          if (marker) {
            map.setView(marker.getLatLng(), 13);
            marker.openPopup();
          }
        } else if (data.type === 'centerOnLocation' && data.lat && data.lng) {
          map.setView([data.lat, data.lng], 11);
          L.circleMarker([data.lat, data.lng], {
            radius: 8,
            color: '#FF6B6B',
            fillColor: '#FF6B6B',
            fillOpacity: 0.8,
          }).addTo(map);
        }
      } catch (e) {}
    });
  </script>
</body>
</html>
    `;
  };

  useEffect(() => {
    if (markerSelected && webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'centerOnMarker',
        spotId: markerSelected.id,
      }));
    }
  }, [markerSelected]);

  useEffect(() => {
    if (location && location.coords && webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'centerOnLocation',
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      }));
    }
  }, [location]);

  const handleMessage = (event) => {
    const spotId = parseInt(event.nativeEvent.data, 10);
    const spot = spots.find((s) => s.id === spotId);
    if (spot && onSpotPress) {
      onSpotPress(spot);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: generateMapHTML() }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
      />
    </View>
  );
};

DivingMapSimple.propTypes = {
  spots: PropTypes.array,
  markerSelected: PropTypes.object,
  onSpotPress: PropTypes.func,
  region: PropTypes.object,
  location: PropTypes.object,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});

export default DivingMapSimple;
