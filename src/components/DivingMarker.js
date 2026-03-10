/**
 * Composant Marker pour un spot de plongée sur la carte
 */

import React from 'react';
import PropTypes from 'prop-types';
import { View, TouchableOpacity } from 'react-native';
import { Marker } from 'react-native-maps';

const DivingMarker = ({ coordinate, spot, onPress, isSelected }) => {
  const markerStyle = {
    width: isSelected ? 45 : 40,
    height: isSelected ? 45 : 40,
    borderRadius: 20,
    backgroundColor: isSelected ? '#FF6B6B' : '#4A90E2',
    borderWidth: isSelected ? 3 : 2,
    borderColor: isSelected ? '#FFFFFF' : '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  };

  return (
    <Marker
      coordinate={{
        latitude: spot.latitude,
        longitude: spot.longitude,
      }}
      onPress={onPress}
      tracksViewChanges={false}
    >
      <View style={markerStyle}>
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: '#FFFFFF',
          }}
        />
      </View>
    </Marker>
  );
};

DivingMarker.propTypes = {
  coordinate: PropTypes.object.isRequired,
  spot: PropTypes.object.isRequired,
  onPress: PropTypes.func.isRequired,
  isSelected: PropTypes.bool,
};

DivingMarker.defaultProps = {
  isSelected: false,
};

export default DivingMarker;
