/**
 * DetailSheet 2026 – Hero fullscreen, thème adaptatif
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  ScrollView,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Linking,
  Platform,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { radius, shadows } from '../theme';
import { toggleFavorite, isFavorite } from '../screens/FavoritesScreen';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DiveSiteTopoModal from './DiveSiteTopoModal';
import OutlineIcon from './OutlineIcon';

const { width: SW, height: SH } = Dimensions.get('window');
const HERO_H = SH * 0.38;

const withCacheBust = (uri, seed) => {
  if (!uri || !/^https?:/.test(uri)) return uri;
  const sep = uri.includes('?') ? '&' : '?';
  return `${uri}${sep}v=${seed}`;
};

const DetailSheet = ({ spot, isVisible, onClose, onDismiss, userLocation, onNavigate }) => {
  const { colors, difficultyMeta } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [activeTab, setActiveTab] = useState('info');
  const [photoIndex, setPhotoIndex] = useState(0);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [topoVisible, setTopoVisible] = useState(false);
  const pendingNavigation = useRef(null);
  const contentScrollRef = useRef(null);
  const tabsPositionRef = useRef(0);
  const [fav, setFav] = useState(false);
  const favScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (spot?.id) {
      isFavorite(spot.id).then(setFav).catch(() => { });
    }
  }, [spot?.id]);

  const handleToggleFav = useCallback(async () => {
    Animated.sequence([
      Animated.spring(favScale, { toValue: 1.4, tension: 150, friction: 5, useNativeDriver: true }),
      Animated.spring(favScale, { toValue: 1, tension: 150, friction: 8, useNativeDriver: true }),
    ]).start();
    const next = await toggleFavorite(spot.id);
    setFav(next);
  }, [spot?.id, favScale]);

  if (!spot) return null;

  const allPhotos = [spot.photos_fond_marin?.[0], spot.photo, ...(spot.photos_fond_marin || [])]
    .filter((u, i, a) => u && a.indexOf(u) === i)
    .map((uri, idx) => withCacheBust(uri, `detail-${spot.id}-${idx}`));

  const diff = difficultyMeta[spot.difficulte] || difficultyMeta.Intermediate;

  const handleCarouselScroll = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SW);
    setPhotoIndex(Math.max(0, Math.min(idx, allPhotos.length - 1)));
  };

  const handleOpenMaps = () => {
    if (!spot.latitude || !spot.longitude) { Alert.alert('Erreur', 'GPS non disponible'); return; }
    const label = encodeURIComponent(spot.nom);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${spot.latitude},${spot.longitude}`,
      android: `geo:0,0?q=${spot.latitude},${spot.longitude}(${label})`,
    });
    Linking.openURL(url).catch(() => Alert.alert('Erreur', "Impossible d'ouvrir la carte"));
  };

  const handleSelectTab = (key) => {
    setActiveTab(key);
    contentScrollRef.current?.scrollTo({ y: tabsPositionRef.current, animated: true });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'info':
        return (
          <View>
            <View style={styles.infoCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><OutlineIcon name="document-text-outline" size={21} color={colors.primary} /><Text style={styles.sectionTitle}>Conditions</Text></View>
              <InfoRow label="Profondeur" value={`${spot.profondeur_min} – ${spot.profondeur_max} m`} icon="arrow-down-outline" />
              <InfoRow label="Visibilité" value={`${spot.visibilite} m`} icon="eye-outline" />
              <InfoRow label="Courant" value={spot.courant} icon="water-outline" />
              <InfoRow label="Difficulté" value={diff.label} accent={diff.color} icon="bar-chart-outline" />
            </View>
            <View style={[styles.infoCard, { marginTop: 14 }]}>
              <Text style={styles.sectionTitle}>Infos pratiques</Text>
              <InfoRow label="Type de site" value={spot.type_site} icon="boat-outline" />
              <InfoRow label="Localité" value={`${spot.localite} ${spot.code_postal}`} icon="location-outline" />
              <InfoRow label="Meilleure saison" value={spot.meilleure_saison} icon="sunny-outline" />
              <InfoRow label="Accès" value={spot.conditions_acces} icon="navigate-outline" />
              <InfoRow label="Capacité" value={`${spot.capacite_plongeurs} plongeurs max`} icon="people-outline" />
            </View>
          </View>
        );
      case 'faune':
        return (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><OutlineIcon name="fish-outline" size={21} color={colors.primary} /><Text style={styles.sectionTitle}>Faune</Text></View>
            <View style={styles.tagsWrap}>
              {spot.faune?.map((a, i) => <Tag key={i} label={a} color={colors.primary} />)}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24 }}><OutlineIcon name="leaf-outline" size={21} color={colors.emerald} /><Text style={styles.sectionTitle}>Flore</Text></View>
            <View style={styles.tagsWrap}>
              {spot.flore?.map((f, i) => <Tag key={i} label={f} color={colors.emerald} />)}
            </View>
            {spot.photos_fond_marin?.length > 0 && (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24 }}><OutlineIcon name="camera-outline" size={21} color={colors.primary} /><Text style={styles.sectionTitle}>Sous-marin</Text></View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
                  {spot.photos_fond_marin.map((uri, i) => {
                    const galleryUri = withCacheBust(uri, `gallery-${spot.id}-${i}`);
                    return (
                      <TouchableOpacity key={i} onPress={() => { setLightboxIndex(allPhotos.indexOf(galleryUri)); setLightboxVisible(true); }}>
                        <Image source={{ uri: galleryUri }} style={styles.galleryThumb} resizeMode="cover" />
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}
          </View>
        );
      case 'description':
        return (
          <View>
            <Text style={styles.sectionTitle}>À propos</Text>
            <Text style={styles.descText}>{spot.description}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24 }}><OutlineIcon name="location-outline" size={21} color={colors.primary} /><Text style={styles.sectionTitle}>Coordonnées GPS</Text></View>
            <View style={styles.gpsCard}>
              <View style={styles.gpsRow}>
                <Text style={styles.gpsKey}>Lat</Text>
                <Text style={styles.gpsVal}>{spot.latitude?.toFixed(5)}</Text>
              </View>
              <View style={[styles.gpsRow, { marginTop: 8 }]}>
                <Text style={styles.gpsKey}>Lng</Text>
                <Text style={styles.gpsVal}>{spot.longitude?.toFixed(5)}</Text>
              </View>
            </View>
          </View>
        );
      default: return null;
    }
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent={false} onRequestClose={onClose} onDismiss={() => {
      const next = pendingNavigation.current;
      pendingNavigation.current = null;
      onDismiss?.();
      if (next) onNavigate?.(next);
    }}>
      <View style={styles.container}>
        <ScrollView
          ref={contentScrollRef}
          style={styles.pageScroll}
          contentContainerStyle={styles.pageScrollContent}
          showsVerticalScrollIndicator={false}
        >

        {/* ── Hero carousel ── */}
        <View style={styles.heroWrap}>
          <ScrollView
            horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleCarouselScroll} scrollEventThrottle={16}
          >
            {allPhotos.map((uri, i) => (
              <TouchableOpacity key={i} activeOpacity={0.95} onPress={() => { setLightboxIndex(i); setLightboxVisible(true); }}>
                <Image source={{ uri }} style={styles.heroImage} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>

          <LinearGradient colors={colors.gradHero} locations={[0, 0.48, 1]} style={styles.heroGradient} pointerEvents="none" />

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <View style={styles.closeBtnInner}><OutlineIcon name="close-outline" size={24} color="#FFFFFF" /></View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.favTopBtn}
            onPress={handleToggleFav}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <View style={[styles.closeBtnInner, fav && styles.favTopBtnActive]}>
              <Animated.View style={{ transform: [{ scale: favScale }] }}>
                <Ionicons name={fav ? 'star' : 'star-outline'} size={24} color="#FFFFFF" />
              </Animated.View>
            </View>
          </TouchableOpacity>

          {allPhotos.length > 1 && (
            <View style={styles.dotsRow}>
              {allPhotos.map((_, i) => (
                <View key={i} style={[styles.dot, i === photoIndex && styles.dotActive]} />
              ))}
            </View>
          )}

          <View style={styles.heroBottom}>
            <View style={[styles.diffBadge, { backgroundColor: diff.badgeBg }]}>
              <View style={styles.diffDot} />
              <Text style={styles.diffBadgeText}>{diff.label}</Text>
            </View>
            <Text style={styles.heroTitle} numberOfLines={2}>{spot.nom}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><OutlineIcon name="location-outline" size={17} color="#BFD3EA" /><Text style={styles.heroSub}>{spot.localite}</Text></View>
          </View>
        </View>

        {/* ── Quick stats ── */}
        <View style={styles.statsRow}>
          <StatItem icon="arrow-down-outline" label="Max" value={`${spot.profondeur_max}m`} color={colors.primary} styles={styles} />
          <View style={styles.statDiv} />
          <StatItem icon="eye-outline" label="Visib." value={`${spot.visibilite}m`} color={colors.emerald} styles={styles} />
          <View style={styles.statDiv} />
          <StatItem icon="water-outline" label="Courant" value={spot.courant} color={colors.amber} styles={styles} />
        </View>

        {/* ── Tabs ── */}
        <View style={styles.tabsSticky} onLayout={(event) => { tabsPositionRef.current = event.nativeEvent.layout.y; }}>
          <View style={styles.tabsRow}>
            {[['info', 'Infos'], ['faune', 'Faune & Flore'], ['description', 'Description']].map(([key, label]) => (
              <TouchableOpacity key={key} style={styles.tab} onPress={() => handleSelectTab(key)} activeOpacity={0.75}>
                <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>{label}</Text>
                {activeTab === key && <View style={styles.tabUnderline} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Contenu ── */}
        <View style={styles.scrollContent}>
          {renderTabContent()}
        </View>
        </ScrollView>

        <View style={styles.ctaRow}>
          <TouchableOpacity style={styles.ctaSecondary} onPress={handleOpenMaps} activeOpacity={0.85}>
            <OutlineIcon name="navigate-outline" size={20} color={colors.primary} />
            <Text style={styles.ctaSecondaryText}>Itinéraire</Text>
          </TouchableOpacity>
          {Boolean(spot.topos?.length) && (
            <TouchableOpacity
              style={styles.ctaPlan}
              onPress={() => setTopoVisible(true)}
              activeOpacity={0.88}
            >
              <LinearGradient colors={colors.gradPrimary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaPlanGrad}>
                <Text style={styles.ctaPlanText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>Plan de plongée</Text>
                <OutlineIcon name="arrow-forward-outline" size={20} color="#03111F" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Lightbox ── */}
      <Modal visible={lightboxVisible} transparent animationType="fade" onRequestClose={() => setLightboxVisible(false)} statusBarTranslucent>
        <View style={styles.lbOverlay}>
          <TouchableOpacity style={styles.lbClose} onPress={() => setLightboxVisible(false)}>
            <OutlineIcon name="close-outline" size={27} color="#FFFFFF" />
          </TouchableOpacity>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            contentOffset={{ x: lightboxIndex * SW, y: 0 }}
            onMomentumScrollEnd={(e) => setLightboxIndex(Math.round(e.nativeEvent.contentOffset.x / SW))}
          >
            {allPhotos.map((uri, i) => (
              <View key={i} style={styles.lbSlide}>
                <Image source={{ uri }} style={styles.lbImage} resizeMode="contain" />
              </View>
            ))}
          </ScrollView>
          <Text style={styles.lbCounter}>{lightboxIndex + 1} / {allPhotos.length}</Text>
        </View>
      </Modal>

      {/* ── Modal Topo & Briefing ── */}
      <DiveSiteTopoModal
        spot={spot}
        isVisible={topoVisible}
        onClose={() => setTopoVisible(false)}
        userLocation={userLocation}
        onNavigate={(key) => {
          pendingNavigation.current = key;
          onClose();
        }}
      />
    </Modal>
  );
};

// Sub-components receive styles as prop to avoid re-calling makeStyles
const InfoRow = ({ label, value, accent, icon }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLabelWrap}>
        {icon && <Ionicons name={icon} size={19} color={colors.primary} />}
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, accent && { color: accent }]}>{value}</Text>
    </View>
  );
};

const Tag = ({ label, color }) => (
  <View style={[{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: color, backgroundColor: `${color}18` }]}>
    <Text style={{ fontSize: 12, fontWeight: '600', color }}>{label}</Text>
  </View>
);

const StatItem = ({ icon, label, value, color, styles }) => (
  <View style={styles.statItem}>
    <OutlineIcon name={icon} size={24} color={color} />
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
  </View>
);

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  pageScroll: { flex: 1 },
  pageScrollContent: { paddingBottom: 108 },

  heroWrap: { height: HERO_H, position: 'relative', backgroundColor: colors.bgCard },
  heroImage: { width: SW, height: HERO_H, backgroundColor: colors.bgCard },
  heroGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: HERO_H * 0.72,
  },
  closeBtn: { position: 'absolute', top: 48, right: 16, zIndex: 10 },
  favTopBtn: { position: 'absolute', top: 48, left: 16, zIndex: 10 },
  closeBtnInner: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(3,17,31,0.86)',
    borderWidth: 1, borderColor: colors.borderBright,
    alignItems: 'center', justifyContent: 'center',
  },
  favTopBtnActive: { backgroundColor: '#C66A00', borderColor: '#FFB020' },
  closeBtnIcon: { color: '#EEF2FF', fontSize: 14, fontWeight: '700' },
  dotsRow: {
    position: 'absolute', bottom: 80, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { width: 18, backgroundColor: colors.primary, borderRadius: 3 },
  heroBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, paddingBottom: 18, gap: 5,
  },
  diffBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radius.pill, marginBottom: 4,
  },
  diffDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  diffBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3, color: '#FFFFFF' },
  heroTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5, lineHeight: 32 },
  heroSub: { fontSize: 15, color: '#BFD3EA' },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.bgElevated,
    paddingVertical: 13, paddingHorizontal: 12,
    marginHorizontal: 14, marginTop: 10, marginBottom: 8,
    borderWidth: 1, borderColor: colors.borderMid,
    borderRadius: 18,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statIcon: { fontSize: 20, marginBottom: 2 },
  statLabel: { fontSize: 10, color: colors.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase' },
  statValue: { fontSize: 15, fontWeight: '800' },
  statDiv: { width: 1, backgroundColor: colors.borderMid, marginVertical: 8 },

  tabsSticky: {
    backgroundColor: colors.bg, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 8,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.bgElevated,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 18,
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', position: 'relative' },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, letterSpacing: 0.2 },
  tabTextActive: { color: colors.primary, fontWeight: '700' },
  tabUnderline: {
    position: 'absolute', bottom: 0, left: '20%', right: '20%',
    height: 3, backgroundColor: colors.primary, borderRadius: 2,
  },

  scrollContent: { minHeight: SH * 0.7, paddingHorizontal: 14, paddingTop: 16, paddingBottom: 24 },

  infoCard: {
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.borderMid,
    borderRadius: 22, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4,
  },

  sectionTitle: {
    fontSize: 17, fontWeight: '800', color: colors.textPrimary,
    letterSpacing: 0, marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  infoLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  infoLabel: { fontSize: 14, color: colors.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, maxWidth: '52%', textAlign: 'right' },

  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  descText: { fontSize: 15, color: colors.textSecondary, lineHeight: 24 },
  gpsCard: {
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    padding: 16, borderWidth: 1, borderColor: colors.primaryMid,
  },
  gpsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  gpsKey: { fontSize: 12, color: colors.primary, fontWeight: '700' },
  gpsVal: {
    fontSize: 15, color: colors.textPrimary, fontWeight: '600',
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },

  galleryScroll: { marginTop: 10 },
  galleryThumb: {
    width: 150, height: 100, borderRadius: radius.md,
    marginRight: 10, backgroundColor: colors.bgCard,
  },

  ctaRow: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 30 : 14,
    backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.borderMid,
  },
  ctaSecondary: {
    flex: 0.82, height: 52, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderMid,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.bgElevated,
  },
  ctaSecondaryText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  ctaPlan: { flex: 1.38, height: 52, borderRadius: radius.lg, overflow: 'hidden' },
  ctaPlanGrad: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, paddingHorizontal: 10,
  },
  ctaPlanText: { fontSize: 15, fontWeight: '800', color: '#03111F', flexShrink: 1 },

  // Lightbox (always dark)
  lbOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.97)', justifyContent: 'center' },
  lbClose: {
    position: 'absolute', top: 52, right: 20, zIndex: 10,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  lbCloseText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  lbSlide: { width: SW, height: SH, justifyContent: 'center', alignItems: 'center' },
  lbImage: { width: SW, height: SH * 0.75 },
  lbCounter: { position: 'absolute', bottom: 48, alignSelf: 'center', color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: '600' },

});

DetailSheet.propTypes = {
  spot: PropTypes.object,
  isVisible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onDismiss: PropTypes.func,
  userLocation: PropTypes.object,
  onNavigate: PropTypes.func,
};

export default DetailSheet;
