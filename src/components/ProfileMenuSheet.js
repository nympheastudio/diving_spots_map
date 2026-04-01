/**
 * ProfileMenuSheet 2026 – Menu profil avant-garde
 * Design: gradient avatar, stats, menu items animés, glass morphism
 */

import React, { useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, shadows, spacing } from '../theme';

const MENU_ITEMS = [
  {
    key:   'account',
    icon:  '◉',
    label: 'Mon Compte',
    sub:   'Profil & préférences',
    color: colors.primary,
  },
  {
    key:   'favorites',
    icon:  '★',
    label: 'Mes Favoris',
    sub:   'Spots sauvegardés',
    color: colors.amber,
  },
  {
    key:   'notifications',
    icon:  '◈',
    label: 'Notifications',
    sub:   'Alertes & rappels',
    color: colors.emerald,
  },
  {
    key:   'settings',
    icon:  '◧',
    label: 'Paramètres',
    sub:   'Unités, langue, thème',
    color: colors.secondary,
  },
  {
    key:   'about',
    icon:  'ℹ',
    label: 'À propos',
    sub:   'Version · Mentions légales',
    color: colors.textMuted,
  },
];

// ── StatBadge ─────────────────────────────────────────────────────────────
const StatBadge = ({ value, label, color }) => (
  <View style={styles.statBadge}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// ── MenuItem ──────────────────────────────────────────────────────────────
const MenuItem = ({ item, onPress, index }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, tension: 200 }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 120 }).start();

  return (
    <TouchableOpacity
      onPress={() => onPress(item.key)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View style={[
        styles.menuItem,
        index === MENU_ITEMS.length - 1 && styles.menuItemLast,
        { transform: [{ scale: scaleAnim }] },
      ]}>
        <View style={[styles.menuIconWrap, { backgroundColor: item.color + '18' }]}>
          <Text style={[styles.menuIcon, { color: item.color }]}>{item.icon}</Text>
        </View>
        <View style={styles.menuTextWrap}>
          <Text style={styles.menuLabel}>{item.label}</Text>
          <Text style={styles.menuSub}>{item.sub}</Text>
        </View>
        <View style={styles.menuChevronWrap}>
          <Text style={styles.menuChevron}>›</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ── ProfileMenuSheet ──────────────────────────────────────────────────────
const ProfileMenuSheet = ({ isVisible, onClose, onMenuPress }) => {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0, tension: 65, friction: 12, useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1, duration: 250, useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(300);
      backdropAnim.setValue(0);
    }
  }, [isVisible]);

  const handleItemPress = useCallback((key) => {
    onMenuPress?.(key);
    onClose();
  }, [onMenuPress, onClose]);

  return (
    <Modal visible={isVisible} animationType="none" transparent onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[
        styles.sheetWrap,
        { transform: [{ translateY: slideAnim }] },
      ]}>
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* ── Profile Header ── */}
          <View style={styles.profileHeader}>
            {/* Gradient avatar */}
            <View style={styles.avatarWrap}>
              <LinearGradient
                colors={colors.gradProfile}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.avatarGradient}
              >
                <Text style={styles.avatarIcon}>🤿</Text>
              </LinearGradient>
              {/* Online indicator */}
              <View style={styles.onlineDot} />
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>Plongeur Explorateur</Text>
              <Text style={styles.profileEmail}>plongeur@diveexplorer.app</Text>
              <View style={styles.memberBadge}>
                <LinearGradient
                  colors={['rgba(0,229,255,0.2)', 'rgba(123,97,255,0.2)']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.memberBadgeGrad}
                >
                  <View style={[styles.memberDot, { backgroundColor: colors.emerald }]} />
                  <Text style={styles.memberText}>Membre Actif · Pro</Text>
                </LinearGradient>
              </View>
            </View>

            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => handleItemPress('account')}
              activeOpacity={0.75}
            >
              <Text style={styles.editIcon}>✎</Text>
            </TouchableOpacity>
          </View>

          {/* ── Stats row ── */}
          <View style={styles.statsRow}>
            <StatBadge value="12"     label="Spots visités" color={colors.primary}  />
            <View style={styles.statDiv} />
            <StatBadge value="3"      label="Favoris"       color={colors.amber}    />
            <View style={styles.statDiv} />
            <StatBadge value="Avancé" label="Niveau"        color={colors.emerald}  />
          </View>

          {/* ── Menu items ── */}
          <ScrollView scrollEnabled={false} style={styles.menuList}>
            {MENU_ITEMS.map((item, index) => (
              <MenuItem
                key={item.key}
                item={item}
                index={index}
                onPress={handleItemPress}
              />
            ))}
          </ScrollView>

          {/* ── Footer ── */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.logoutBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.logoutIcon}>↩</Text>
              <Text style={styles.logoutText}>Déconnexion</Text>
            </TouchableOpacity>
            <Text style={styles.versionText}>Dive Explorer v2.0 · Ocean Deep Edition</Text>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  sheetWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: colors.borderMid,
    borderBottomWidth: 0,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    // Top glow
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderMid,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 6,
  },

  // ── Profile header ──
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  avatarIcon: {
    fontSize: 28,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.emerald,
    borderWidth: 2,
    borderColor: colors.bgElevated,
  },
  profileInfo: {
    flex: 1,
    gap: 3,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.1,
  },
  profileEmail: {
    fontSize: 12,
    color: colors.textMuted,
  },
  memberBadge: {
    marginTop: 5,
    alignSelf: 'flex-start',
  },
  memberBadgeGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primaryMid,
  },
  memberDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  memberText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.3,
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgGlassLight,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIcon: {
    fontSize: 16,
    color: colors.textSecondary,
  },

  // ── Stats ──
  statsRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statBadge: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDiv: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },

  // ── Menu items ──
  menuList: {
    paddingTop: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    fontSize: 20,
  },
  menuTextWrap: {
    flex: 1,
    gap: 2,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  menuSub: {
    fontSize: 12,
    color: colors.textMuted,
  },
  menuChevronWrap: {
    width: 24,
    alignItems: 'center',
  },
  menuChevron: {
    fontSize: 22,
    color: colors.textMuted,
    fontWeight: '300',
    marginTop: -2,
  },

  // ── Footer ──
  footer: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.accentDim,
    backgroundColor: 'rgba(255,71,87,0.07)',
  },
  logoutIcon: {
    fontSize: 15,
    color: colors.accent,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent,
  },
  versionText: {
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
});

export default ProfileMenuSheet;
