/**
 * ProfileNavigator 2026 – navigation full-screen avec slide 2-slots
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity,
  StyleSheet, Platform, Animated, Dimensions, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import AccountScreen       from '../screens/AccountScreen';
import FavoritesScreen     from '../screens/FavoritesScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import SettingsScreen      from '../screens/SettingsScreen';
import AboutScreen         from '../screens/AboutScreen';

import { useTheme } from '../context/ThemeContext';
import { radius } from '../theme';

const { width: SW } = Dimensions.get('window');

const MENU_ITEMS = [
  { key: 'account',       icon: '◉', label: 'Mon Compte',    sub: 'Profil & préférences'       },
  { key: 'favorites',     icon: '★', label: 'Mes Favoris',   sub: 'Spots sauvegardés'           },
  { key: 'notifications', icon: '◈', label: 'Notifications', sub: 'Alertes & rappels'           },
  { key: 'settings',      icon: '◧', label: 'Paramètres',    sub: 'Unités, langue, thème'       },
  { key: 'about',         icon: 'ℹ', label: 'À propos',      sub: 'Version · Mentions légales'  },
];

const MENU_COLORS = ['primary', 'amber', 'emerald', 'secondary', 'textMuted'];

// ── ProfileNavigator ──────────────────────────────────────────────────────
const ProfileNavigator = ({ isVisible, onClose }) => {
  const { isDark } = useTheme();
  const [activeScreen, setActiveScreen] = useState(null);
  const slideAnim  = useRef(new Animated.Value(0)).current;
  const isAnimRef  = useRef(false);

  useEffect(() => {
    if (isVisible) {
      setActiveScreen(null);
      slideAnim.setValue(0);
    }
  }, [isVisible]);

  const push = useCallback((screenKey) => {
    if (isAnimRef.current) return;
    isAnimRef.current = true;
    setActiveScreen(screenKey);
    requestAnimationFrame(() => {
      Animated.spring(slideAnim, {
        toValue: 1, tension: 80, friction: 14, useNativeDriver: true,
      }).start(() => { isAnimRef.current = false; });
    });
  }, [slideAnim]);

  const pop = useCallback(() => {
    if (isAnimRef.current) return;
    isAnimRef.current = true;
    Animated.spring(slideAnim, {
      toValue: 0, tension: 80, friction: 14, useNativeDriver: true,
    }).start(() => {
      setActiveScreen(null);
      isAnimRef.current = false;
    });
  }, [slideAnim]);

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1], outputRange: [0, -SW],
  });

  const renderSubScreen = (key) => {
    const props = { onBack: pop };
    switch (key) {
      case 'account':       return <AccountScreen       {...props} />;
      case 'favorites':     return <FavoritesScreen     {...props} />;
      case 'notifications': return <NotificationsScreen {...props} />;
      case 'settings':      return <SettingsScreen      {...props} />;
      case 'about':         return <AboutScreen         {...props} />;
      default: return null;
    }
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={false}
      onRequestClose={activeScreen ? pop : onClose}
    >
      <ProfileContent
        onNavigate={push}
        onClose={onClose}
        activeScreen={activeScreen}
        translateX={translateX}
        renderSubScreen={renderSubScreen}
        isDark={isDark}
      />
    </Modal>
  );
};

// Extracted to allow useTheme inside Modal
const ProfileContent = ({ onNavigate, onClose, activeScreen, translateX, renderSubScreen }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle={colors.bg === '#050A10' ? 'light-content' : 'dark-content'} />
      <View style={styles.slotOuter}>
        <Animated.View style={[styles.twoSlotRow, { transform: [{ translateX }] }]}>
          <View style={styles.slot}>
            <MenuContent onNavigate={onNavigate} onClose={onClose} />
          </View>
          <View style={styles.slot}>
            {activeScreen ? renderSubScreen(activeScreen) : null}
          </View>
        </Animated.View>
      </View>
    </View>
  );
};

// ── MenuContent ───────────────────────────────────────────────────────────
const MenuContent = ({ onNavigate, onClose }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.menu}>
      <View style={styles.menuHeader}>
        <Text style={styles.menuTitle}>Mon Profil</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} bounces>

        {/* Avatar + infos */}
        <View style={styles.profileRow}>
          <View style={styles.avatarWrap}>
            <LinearGradient
              colors={colors.gradProfile}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.avatarGrad}
            >
              <Text style={styles.avatarEmoji}>🤿</Text>
            </LinearGradient>
            <View style={styles.onlineDot} />
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Plongeur Explorateur</Text>
            <Text style={styles.profileEmail}>plongeur@diveexplorer.app</Text>
            <View style={styles.memberBadge}>
              <LinearGradient
                colors={[colors.primaryDim, colors.secondaryDim]}
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
            onPress={() => onNavigate('account')}
            activeOpacity={0.75}
          >
            <Text style={styles.editIcon}>✎</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatBadge value="12"     label="Spots"   color={colors.primary}  styles={styles} />
          <View style={styles.statDiv} />
          <StatBadge value="3"      label="Favoris" color={colors.amber}    styles={styles} />
          <View style={styles.statDiv} />
          <StatBadge value="Avancé" label="Niveau"  color={colors.emerald}  styles={styles} />
        </View>

        {/* Menu items */}
        <View style={styles.menuList}>
          {MENU_ITEMS.map((item, i) => {
            const color = colors[MENU_COLORS[i]];
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.menuItem, i === MENU_ITEMS.length - 1 && styles.menuItemLast]}
                onPress={() => onNavigate(item.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconWrap, { backgroundColor: color + '18' }]}>
                  <Text style={[styles.menuIcon, { color }]}>{item.icon}</Text>
                </View>
                <View style={styles.menuTextWrap}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSub}>{item.sub}</Text>
                </View>
                <Text style={styles.menuChevron}>›</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Footer */}
        <View style={styles.menuFooter}>
          <TouchableOpacity style={styles.logoutBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.logoutIcon}>↩</Text>
            <Text style={styles.logoutText}>Déconnexion</Text>
          </TouchableOpacity>
          <Text style={styles.versionText}>Dive Explorer v2.0 · Ocean Deep Edition</Text>
        </View>

      </ScrollView>
    </View>
  );
};

const StatBadge = ({ value, label, color, styles }) => (
  <View style={styles.statBadge}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const makeStyles = (colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  slotOuter: { flex: 1, overflow: 'hidden' },
  twoSlotRow: { flexDirection: 'row', width: SW * 2, flex: 1 },
  slot: { width: SW, flex: 1 },

  menu: { flex: 1, backgroundColor: colors.bg },
  menuHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 58 : 38,
    paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  menuTitle: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.3 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.bgGlassLight,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  closeIcon: { fontSize: 13, color: colors.textSecondary, fontWeight: '700' },

  profileRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 20,
    gap: 14, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  avatarWrap:  { position: 'relative' },
  avatarGrad: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45, shadowRadius: 14, elevation: 10,
  },
  avatarEmoji: { fontSize: 28 },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 13, height: 13, borderRadius: 7,
    backgroundColor: colors.emerald, borderWidth: 2, borderColor: colors.bg,
  },
  profileInfo:  { flex: 1, gap: 3 },
  profileName:  { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  profileEmail: { fontSize: 12, color: colors.textMuted },
  memberBadge:  { marginTop: 5, alignSelf: 'flex-start' },
  memberBadgeGrad: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.primaryMid,
  },
  memberDot:   { width: 6, height: 6, borderRadius: 3 },
  memberText:  { fontSize: 10, fontWeight: '700', color: colors.primary, letterSpacing: 0.3 },
  editBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.bgGlassLight,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  editIcon: { fontSize: 16, color: colors.textSecondary },

  statsRow: {
    flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  statBadge: { flex: 1, alignItems: 'center', gap: 3 },
  statValue: { fontSize: 17, fontWeight: '800' },
  statLabel: { fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  statDiv:   { width: 1, backgroundColor: colors.border, marginVertical: 4 },

  menuList:     { paddingTop: 6 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 13, gap: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuIconWrap: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  menuIcon:     { fontSize: 20 },
  menuTextWrap: { flex: 1, gap: 2 },
  menuLabel:    { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  menuSub:      { fontSize: 12, color: colors.textMuted },
  menuChevron:  { fontSize: 22, color: colors.textMuted, fontWeight: '300', marginTop: -2 },

  menuFooter: {
    paddingHorizontal: 20, paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 52 : 36,
    alignItems: 'center', gap: 12,
  },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 13, paddingHorizontal: 32,
    borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.accentDim, backgroundColor: colors.accentDim,
  },
  logoutIcon: { fontSize: 15, color: colors.accent },
  logoutText: { fontSize: 14, fontWeight: '700', color: colors.accent },
  versionText: { fontSize: 11, color: colors.textMuted, letterSpacing: 0.3 },
});

export default ProfileNavigator;
