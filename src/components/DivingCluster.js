/**
 * Composant Cluster pour regrouper les markers
 */

import React from 'react';
import PropTypes from 'prop-types';
import { View, Text } from 'react-native';
import { Marker } from 'react-native-maps';

const DivingCluster = ({ coordinate, onPress, pointCount }) => {
  // Style pour le cluster
  const clusterStyle = {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF6B6B',
    borderWidth: 2,
    borderColor: '#C92A2A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3.84,
    elevation: 5,
  };

  return (
    <Marker coordinate={coordinate} onPress={onPress} tracksViewChanges={false}>
      <View style={clusterStyle}>
        <Text
          style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: '#FFFFFF',
            textAlign: 'center',
          }}
        >
          {pointCount}
        </Text>
      </View>
    </Marker>
  );
};

DivingCluster.propTypes = {
  coordinate: PropTypes.object.isRequired,
  onPress: PropTypes.func.isRequired,
  pointCount: PropTypes.number.isRequired,
};

export default DivingCluster;
