/**
 * App Principal – Ocean Deep Ultra 2026
 * Avant-garde: animated tab bar × onboarding × profile menu × glow effects
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Animated,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';

// Services
import DivingDataService from './src/services/DivingDataService';

// Theme
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

// Composants
import SearchBar        from './src/components/SearchBar';
import DivingMap        from './src/components/DivingMapSimple';
import ListView         from './src/components/ListView';
import DetailSheet      from './src/components/DetailSheet';
import FilterSheet      from './src/components/FilterSheet';
import OnboardingScreen, { checkOnboardingDone } from './src/components/OnboardingScreen';
import ProfileNavigator from './src/components/ProfileNavigator';

const TAB_ITEMS = [
  { key: 'map',     icon: '◎', label: 'Explorer'  },
  { key: 'list',    icon: '▤', label: 'Liste'      },
  { key: 'filter',  icon: '⧉', label: 'Filtres'   },
  { key: 'profile', icon: '◉', label: 'Profil', isProfile: true },
];

// ── Root wraps everything in ThemeProvider ────────────────────────────────
export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

// ── AppContent ────────────────────────────────────────────────────────────
function AppContent() {
  const { colors, isDark } = useTheme();

  // ── State ─────────────────────────────────────────────────────────────
  const [allSpots,           setAllSpots]           = useState([]);
  const [currentMarkers,     setCurrentMarkers]     = useState([]);
  const [userLocation,       setUserLocation]       = useState(null);
  const [selectedSpot,       setSelectedSpot]       = useState(null);
  const [viewMode,           setViewMode]           = useState('map');
  const [isLoading,          setIsLoading]          = useState(true);
  const [appReady,           setAppReady]           = useState(false);
  const [filters,            setFilters]            = useState({});
  const [detailVisible,      setDetailVisible]      = useState(false);
  const [filterVisible,      setFilterVisible]      = useState(false);
  const [profileVisible,     setProfileVisible]     = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  const [showOnboarding,     setShowOnboarding]     = useState(false);

  const regionRef = useRef({
    latitude: 43.2965, longitude: 5.3698,
    latitudeDelta: 1.5, longitudeDelta: 1.5,
  });

  // Per-tab scale animations (4 tabs)
  const tabScales = useRef(TAB_ITEMS.map(() => new Animated.Value(1))).current;

  // ── Init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [onboardingDone, locationResult, spots] = await Promise.all([
          checkOnboardingDone(),
          Location.requestForegroundPermissionsAsync().then(async ({ status }) => {
            if (status !== 'granted') return null;
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          }),
          DivingDataService.getAllDivingSpots(),
        ]);
        if (!mounted) return;
        if (locationResult) setUserLocation(locationResult);
        setAllSpots(spots);
        setCurrentMarkers(spots);
        setShowOnboarding(!onboardingDone);
      } catch (e) {
        Alert.alert('Erreur', 'Impossible de charger les données');
      } finally {
        if (mounted) { setIsLoading(false); setAppReady(true); }
      }
    })();
    return () => { mounted = false; };
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleApplyFilters = useCallback(async (newFilters) => {
    setFilters(newFilters);
    const count = [
      newFilters.difficulty?.length,
      newFilters.type?.length,
      newFilters.maxDepth && newFilters.maxDepth < 70 ? 1 : 0,
      newFilters.minVisibility ? 1 : 0,
    ].reduce((a, b) => a + (b || 0), 0);
    setActiveFiltersCount(count);
    setIsLoading(true);
    try {
      const filtered = await DivingDataService.filterDivingSpots(newFilters);
      setCurrentMarkers(filtered);
    } catch {
      Alert.alert('Erreur', 'Impossible de filtrer les spots');
    } finally { setIsLoading(false); }
  }, []);

  const handleSpotPress = useCallback((spot) => {
    setSelectedSpot(spot);
    setDetailVisible(true);
  }, []);

  const handleSaveCurrentMarkers = useCallback((markers) => {
    setCurrentMarkers(markers);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailVisible(false);
    setTimeout(() => setSelectedSpot(null), 300);
  }, []);

  const handleTabPress = useCallback((key, index) => {
    Animated.sequence([
      Animated.timing(tabScales[index], { toValue: 0.82, duration: 75, useNativeDriver: true }),
      Animated.spring(tabScales[index], { toValue: 1, tension: 130, friction: 7, useNativeDriver: true }),
    ]).start();

    if (key === 'filter')  { setFilterVisible(true);  return; }
    if (key === 'profile') { setProfileVisible(true); return; }
    setViewMode(key);
  }, [tabScales]);

  const handleRegionChange = useCallback((r) => { regionRef.current = r; }, []);

  // ── Memos ─────────────────────────────────────────────────────────────
  const mapProps = useMemo(() => ({
    spots: allSpots,
    currentMarkers,
    saveCurrentMarkers: handleSaveCurrentMarkers,
    location: userLocation,
    markerSelected: selectedSpot,
    setMarkerSelected: setSelectedSpot,
    onSpotPress: handleSpotPress,
    region: regionRef.current,
    setRegion: handleRegionChange,
    filters,
  }), [allSpots, currentMarkers, selectedSpot, userLocation, filters,
      handleSpotPress, handleSaveCurrentMarkers, handleRegionChange]);

  const styles = useMemo(() => makeStyles(colors), [colors]);

  // ── Loading ───────────────────────────────────────────────────────────
  if (isLoading && !appReady) {
    return <LoadingScreen />;
  }

  // ── Onboarding ────────────────────────────────────────────────────────
  if (showOnboarding) {
    return <OnboardingScreen onDone={() => setShowOnboarding(false)} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />

      {/* ── Main content ── */}
      <View style={styles.mainContent}>
        {viewMode === 'map' ? (
          <DivingMap {...mapProps} />
        ) : (
          <ListView spots={currentMarkers} userLocation={userLocation} onSpotPress={handleSpotPress} />
        )}

        {/* SearchBar flottante */}
        <View style={styles.searchOverlay}>
          <SearchBar onSpotSelect={handleSpotPress} onClose={() => {}} />
        </View>
      </View>

      {/* ── Premium Bottom Nav ── */}
      <View style={styles.bottomNavWrap}>
        <LinearGradient
          colors={colors.gradNav}
          style={styles.navFade}
          pointerEvents="none"
        />
        <View style={styles.bottomNav}>
          {TAB_ITEMS.map((item, index) => (
            <TabNavButton
              key={item.key}
              item={item}
              active={
                item.key === 'map'     ? viewMode === 'map'  :
                item.key === 'list'    ? viewMode === 'list' :
                item.key === 'filter'  ? filterVisible       :
                item.key === 'profile' ? profileVisible      : false
              }
              badge={item.key === 'filter' && activeFiltersCount > 0 ? activeFiltersCount : 0}
              scaleAnim={tabScales[index]}
              onPress={() => handleTabPress(item.key, index)}
            />
          ))}
        </View>
      </View>

      {/* ── Modals ── */}
      <DetailSheet      spot={selectedSpot} isVisible={detailVisible}  onClose={handleCloseDetail}           />
      <FilterSheet      isVisible={filterVisible}  onClose={() => setFilterVisible(false)}  onApplyFilters={handleApplyFilters} />
      <ProfileNavigator isVisible={profileVisible} onClose={() => setProfileVisible(false)} />
    </SafeAreaView>
  );
}

// ── LoadingScreen ─────────────────────────────────────────────────────────
const LoadingScreen = () => {
  const { colors, isDark } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.18, duration: 950, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 950, useNativeDriver: true }),
        ])
      ),
    ]).start();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <Animated.View style={{ alignItems: 'center', opacity: fadeAnim }}>
        <Animated.Text style={{ fontSize: 64, transform: [{ scale: pulseAnim }] }}>
          🌊
        </Animated.Text>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 28 }} />
        <Text style={{ marginTop: 14, fontSize: 14, color: colors.textSecondary, letterSpacing: 0.5 }}>
          Chargement des spots…
        </Text>
      </Animated.View>
    </View>
  );
};

// ── TabNavButton ──────────────────────────────────────────────────────────
const TabNavButton = React.memo(({ item, active, badge, scaleAnim, onPress }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  if (item.isProfile) {
    return (
      <TouchableOpacity style={styles.tabButton} onPress={onPress} activeOpacity={1}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <LinearGradient
            colors={active ? colors.gradProfile : ['rgba(0,229,255,0.22)', 'rgba(123,97,255,0.22)']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[styles.profileCircle, active && styles.profileCircleActive]}
          >
            <Text style={[styles.profileCircleIcon, active && styles.profileCircleIconActive]}>
              {item.icon}
            </Text>
          </LinearGradient>
        </Animated.View>
        <Text style={[styles.tabLabel, active && styles.tabLabelProfile]}>{item.label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.tabButton} onPress={onPress} activeOpacity={1}>
      <Animated.View style={[
        styles.tabIconWrap,
        active && styles.tabIconWrapActive,
        { transform: [{ scale: scaleAnim }] },
      ]}>
        <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{item.icon}</Text>
        {badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </Animated.View>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{item.label}</Text>
    </TouchableOpacity>
  );
});

// ── Styles ────────────────────────────────────────────────────────────────
const makeStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  mainContent: {
    flex: 1,
  },
  searchOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 12 : 16,
    left: 0,
    right: 0,
    zIndex: 100,
  },

  // ── Bottom Nav ──
  bottomNavWrap: {
    position: 'relative',
  },
  navFade: {
    position: 'absolute',
    top: -36,
    left: 0,
    right: 0,
    height: 36,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: Platform.OS === 'ios' ? 22 : 8,
    paddingTop: 8,
    paddingHorizontal: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 20,
  },

  // ── Tab button ──
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
    gap: 4,
  },
  tabIconWrap: {
    width: 46,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapActive: {
    backgroundColor: colors.primaryDim,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 6,
  },
  tabIcon: {
    fontSize: 22,
    color: colors.textMuted,
  },
  tabIconActive: {
    color: colors.primary,
  },
  tabLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  tabLabelProfile: {
    color: colors.secondary,
    fontWeight: '700',
  },

  // ── Profile circle button ──
  profileCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primaryMid,
  },
  profileCircleActive: {
    borderColor: 'transparent',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 16,
    elevation: 10,
  },
  profileCircleIcon: {
    fontSize: 22,
    color: colors.primary,
  },
  profileCircleIconActive: {
    color: '#fff',
  },

  // ── Badge ──
  badge: {
    position: 'absolute',
    top: -2,
    right: 2,
    backgroundColor: colors.accent,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
  },
});
