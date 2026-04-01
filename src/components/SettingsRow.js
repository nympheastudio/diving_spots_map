/**
 * SettingsRow – ligne de paramètre réutilisable
 */

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { radius } from '../theme';

const SettingsRow = ({
  icon,
  iconColor,
  label,
  subtitle,
  rightSlot,
  onPress,
  showBorder = true,
  danger = false,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <TouchableOpacity
      style={[styles.row, !showBorder && styles.rowNoBorder]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      {icon !== undefined && (
        <View style={[
          styles.iconWrap,
          { backgroundColor: danger ? colors.accentDim : (iconColor || colors.primary) + '18' },
        ]}>
          <Text style={[
            styles.icon,
            { color: danger ? colors.accent : (iconColor || colors.primary) },
          ]}>
            {icon}
          </Text>
        </View>
      )}

      <View style={styles.textBlock}>
        <Text style={[styles.label, danger && { color: colors.accent }]}>{label}</Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </View>

      {rightSlot}
    </TouchableOpacity>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 56,
    backgroundColor: colors.bgCard,
  },
  rowNoBorder: {
    borderBottomWidth: 0,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sub: {
    fontSize: 12,
    color: colors.textMuted,
  },
});

export default SettingsRow;
