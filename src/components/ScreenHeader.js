/**
 * ScreenHeader – header partagé pour toutes les screens du profil
 */

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { radius } from '../theme';

const ScreenHeader = ({ title, onBack, rightAction }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={onBack}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={styles.backIcon}>‹</Text>
      </TouchableOpacity>

      <Text style={styles.title} numberOfLines={1}>{title}</Text>

      {rightAction ? (
        <TouchableOpacity
          style={styles.rightBtn}
          onPress={rightAction.onPress}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.rightIcon}>{rightAction.icon}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgGlassLight,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 26,
    color: colors.textPrimary,
    fontWeight: '300',
    lineHeight: 30,
    marginLeft: -2,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.1,
    marginHorizontal: 8,
  },
  rightBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryDim,
    borderWidth: 1,
    borderColor: colors.primaryMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightIcon: {
    fontSize: 18,
    color: colors.primary,
  },
  placeholder: {
    width: 40,
  },
});

export default ScreenHeader;
