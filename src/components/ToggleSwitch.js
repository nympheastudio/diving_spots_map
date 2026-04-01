/**
 * ToggleSwitch – toggle animé custom, thème adaptatif
 */

import React, { useRef, useEffect } from 'react';
import { Animated, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const ToggleSwitch = ({ value, onValueChange, color, disabled = false }) => {
  const { colors } = useTheme();
  const activeColor = color || colors.primary;
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: value ? 1 : 0,
      tension: 130,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [value]);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => !disabled && onValueChange(!value)}
      style={[
        styles.track,
        {
          backgroundColor: value ? activeColor : colors.bgGlassStrong,
          borderColor: colors.border,
        },
        disabled && styles.disabled,
      ]}
    >
      <Animated.View
        style={[
          styles.thumb,
          {
            transform: [
              { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [2, 20] }) },
            ],
            backgroundColor: value ? '#fff' : colors.textMuted,
          },
        ]}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  track: {
    width: 44,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    borderWidth: 1,
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  disabled: {
    opacity: 0.4,
  },
});

export default ToggleSwitch;
