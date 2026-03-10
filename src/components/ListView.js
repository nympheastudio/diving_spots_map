/**
 * Composant ListView - Affiche les spots sous forme de liste
 */

import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { orderByDistance } from 'geolib';

const ListView = ({ spots = [], userLocation = null, onSpotPress }) => {
  const [sortedSpots, setSortedSpots] = useState([]);

  // Trier les spots par distance ou ordre par défaut
  React.useEffect(() => {
    if (!spots || spots.length === 0) {
      setSortedSpots([]);
      return;
    }

    if (userLocation?.latitude && userLocation?.longitude) {
      // Trier par distance depuis la position actuelle
      const validSpots = spots.filter(s => s && s.latitude && s.longitude);
      const sorted = orderByDistance(userLocation, validSpots);
      setSortedSpots(sorted);
    } else {
      // Ordre par défaut
      setSortedSpots(spots);
    }
  }, [spots, userLocation]);

  const renderSpotItem = ({ item, index }) => {
    // Calculer la distance si la position est disponible
    let distanceText = '';
    if (userLocation?.latitude && userLocation?.longitude && item.distance) {
      const km = (item.distance / 1000).toFixed(1);
      distanceText = `${km} km`;
    }

    return (
      <TouchableOpacity
        style={styles.spotItem}
        onPress={() => onSpotPress?.(item)}
        activeOpacity={0.7}
      >
        {/* Image du spot */}
        <Image
          source={{ uri: item.photo }}
          style={styles.spotImage}
          resizeMode="cover"
        />

        {/* Contenu */}
        <View style={styles.spotContent}>
          <View style={styles.spotHeader}>
            <Text style={styles.spotTitle} numberOfLines={1}>
              {item.nom}
            </Text>
            <View style={styles.difficultyBadge}>
              <Text style={styles.difficultyText}>{item.difficulte}</Text>
            </View>
          </View>

          <Text style={styles.spotLocation}>
            {item.localite} • {item.code_postal}
          </Text>

          <View style={styles.spotMetrics}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Type:</Text>
              <Text style={styles.metricValue}>{item.type_site}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Profondeur:</Text>
              <Text style={styles.metricValue}>
                {item.profondeur_min}-{item.profondeur_max}m
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Visibilité:</Text>
              <Text style={styles.metricValue}>{item.visibilite}m</Text>
            </View>
          </View>

          {distanceText && (
            <Text style={styles.distanceText}>📍 {distanceText}</Text>
          )}

          <Text style={styles.spotDescription} numberOfLines={2}>
            {item.description}
          </Text>
        </View>

        {/* Flèche */}
        <View style={styles.arrowContainer}>
          <Text style={styles.arrow}>›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>Aucun spot trouvé</Text>
      <Text style={styles.emptySubtitle}>Ajustez vos filtres ou recherchez dans une autre région</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={sortedSpots}
        renderItem={renderSpotItem}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={renderEmptyList}
        contentContainerStyle={sortedSpots.length === 0 ? styles.emptyListContent : null}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#13131D',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6C7383',
    textAlign: 'center',
  },
  spotItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  spotImage: {
    width: 100,
    height: 120,
    backgroundColor: '#E8E8E8',
  },
  spotContent: {
    flex: 1,
    padding: 12,
  },
  spotHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  spotTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#13131D',
    marginRight: 8,
  },
  difficultyBadge: {
    backgroundColor: '#FFE8E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#C92A2A',
  },
  spotLocation: {
    fontSize: 12,
    color: '#6C7383',
    marginBottom: 6,
  },
  spotMetrics: {
    flexDirection: 'row',
    marginBottom: 6,
    gap: 8,
  },
  metric: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#13131D',
  },
  distanceText: {
    fontSize: 11,
    color: '#4A90E2',
    fontWeight: '600',
    marginBottom: 4,
  },
  spotDescription: {
    fontSize: 11,
    color: '#666',
    lineHeight: 15,
  },
  arrowContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 12,
  },
  arrow: {
    fontSize: 24,
    color: '#CCC',
    fontWeight: 'bold',
  },
  separator: {
    height: 0.5,
    backgroundColor: '#E8E8E8',
    marginHorizontal: 12,
  },
});

ListView.propTypes = {
  spots: PropTypes.array,
  userLocation: PropTypes.object,
  onSpotPress: PropTypes.func,
};

ListView.defaultProps = {
  spots: [],
  userLocation: null,
  onSpotPress: () => {},
};

export default ListView;
