/**
 * Composant MapButtons - Boutons de contrôle de la carte
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import OutlineIcon from './OutlineIcon';

const MapButtons = ({ onMyLocation, onListView }) => {
  return (
    <View style={styles.container}>
      {/* Bouton Ma localisation */}
      <TouchableOpacity
        style={styles.button}
        onPress={onMyLocation}
        activeOpacity={0.7}
      >
        <OutlineIcon name="locate-outline" size={25} color="#03111F" />
      </TouchableOpacity>

      {/* Bouton Vue liste */}
      <TouchableOpacity
        style={styles.button}
        onPress={onListView}
        activeOpacity={0.7}
      >
        <OutlineIcon name="list-outline" size={25} color="#03111F" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    gap: 10,
  },
  button: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    fontSize: 24,
  },
});

MapButtons.propTypes = {
  onMyLocation: PropTypes.func,
  onListView: PropTypes.func,
};

MapButtons.defaultProps = {
  onMyLocation: () => {},
  onListView: () => {},
};

export default MapButtons;
