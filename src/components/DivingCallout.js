/**
 * Composant Callout/Preview pour afficher un aperçu du spot
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { Callout } from 'react-native-maps';

const DivingCallout = ({ spot, setLayout, onPress }) => {
  if (!spot) return null;

  return (
    <Callout
      tooltip
      onLayout={(event) => setLayout(event.nativeEvent.layout)}
    >
      <View style={styles.calloutContainer}>
        {/* Image du spot */}
        {spot.photo && (
          <Image
            source={{ uri: spot.photo }}
            style={styles.calloutImage}
            resizeMode="cover"
          />
        )}

        {/* Contenu textuel */}
        <View style={styles.calloutContent}>
          <Text style={styles.calloutTitle} numberOfLines={2}>
            {spot.nom}
          </Text>

          <Text style={styles.calloutSubtitle} numberOfLines={1}>
            {spot.localite} • {spot.difficulte}
          </Text>

          <View style={styles.calloutDetails}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Profondeur:</Text>
              <Text style={styles.detailValue}>
                {spot.profondeur_min}-{spot.profondeur_max}m
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Visibilité:</Text>
              <Text style={styles.detailValue}>{spot.visibilite}m</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.viewButton}
            onPress={onPress}
            activeOpacity={0.7}
          >
            <Text style={styles.viewButtonText}>Voir les détails</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Callout>
  );
};

const styles = StyleSheet.create({
  calloutContainer: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  calloutImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#E8E8E8',
  },
  calloutContent: {
    padding: 12,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#13131D',
    marginBottom: 4,
  },
  calloutSubtitle: {
    fontSize: 12,
    color: '#6C7383',
    marginBottom: 8,
  },
  calloutDetails: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#13131D',
  },
  viewButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

DivingCallout.propTypes = {
  spot: PropTypes.object.isRequired,
  setLayout: PropTypes.func,
  onPress: PropTypes.func,
};

DivingCallout.defaultProps = {
  setLayout: () => {},
  onPress: () => {},
};

export default DivingCallout;
