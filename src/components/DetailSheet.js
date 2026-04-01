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

const { width: SW, height: SH } = Dimensions.get('window');
const HERO_H = SH * 0.42;

const DetailSheet = ({ spot, isVisible, onClose }) => {
  const { colors, difficultyMeta } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [activeTab,       setActiveTab]       = useState('info');
  const [photoIndex,      setPhotoIndex]      = useState(0);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex,   setLightboxIndex]   = useState(0);
  const [fav,             setFav]             = useState(false);
  const favScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (spot?.id) {
      isFavorite(spot.id).then(setFav).catch(() => {});
    }
  }, [spot?.id]);

  const handleToggleFav = useCallback(async () => {
    Animated.sequence([
      Animated.spring(favScale, { toValue: 1.4, tension: 150, friction: 5, useNativeDriver: true }),
      Animated.spring(favScale, { toValue: 1,   tension: 150, friction: 8, useNativeDriver: true }),
    ]).start();
    const next = await toggleFavorite(spot.id);
    setFav(next);
  }, [spot?.id, favScale]);

  if (!spot) return null;

  const allPhotos = [spot.photo, ...(spot.photos_fond_marin || [])].filter(
    (u, i, a) => u && a.indexOf(u) === i,
  );

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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'info':
        return (
          <View>
            <Text style={styles.sectionTitle}>Conditions</Text>
            <InfoRow label="Profondeur"   value={`${spot.profondeur_min} – ${spot.profondeur_max} m`} />
            <InfoRow label="Visibilité"   value={`${spot.visibilite} m`} />
            <InfoRow label="Courant"      value={spot.courant} />
            <InfoRow label="Difficulté"   value={spot.difficulte} accent={diff.color} />
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Infos pratiques</Text>
            <InfoRow label="Type de site"     value={spot.type_site} />
            <InfoRow label="Localité"         value={`${spot.localite} ${spot.code_postal}`} />
            <InfoRow label="Meilleure saison" value={spot.meilleure_saison} />
            <InfoRow label="Accès"            value={spot.conditions_acces} />
            <InfoRow label="Capacité"         value={`${spot.capacite_plongeurs} plongeurs max`} />
          </View>
        );
      case 'faune':
        return (
          <View>
            <Text style={styles.sectionTitle}>🐠 Faune</Text>
            <View style={styles.tagsWrap}>
              {spot.faune?.map((a, i) => <Tag key={i} label={a} color={colors.primary} />)}
            </View>
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>🌿 Flore</Text>
            <View style={styles.tagsWrap}>
              {spot.flore?.map((f, i) => <Tag key={i} label={f} color={colors.emerald} />)}
            </View>
            {spot.photos_fond_marin?.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>📸 Sous-marin</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
                  {spot.photos_fond_marin.map((uri, i) => (
                    <TouchableOpacity key={i} onPress={() => { setLightboxIndex(allPhotos.indexOf(uri)); setLightboxVisible(true); }}>
                      <Image source={{ uri }} style={styles.galleryThumb} resizeMode="cover" />
                    </TouchableOpacity>
                  ))}
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
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>📍 Coordonnées GPS</Text>
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
    <Modal visible={isVisible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>

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

          <View style={styles.heroGradient} pointerEvents="none" />

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <View style={styles.closeBtnInner}><Text style={styles.closeBtnIcon}>✕</Text></View>
          </TouchableOpacity>

          {allPhotos.length > 1 && (
            <View style={styles.dotsRow}>
              {allPhotos.map((_, i) => (
                <View key={i} style={[styles.dot, i === photoIndex && styles.dotActive]} />
              ))}
            </View>
          )}

          <View style={styles.heroBottom}>
            <View style={[styles.diffBadge, { backgroundColor: diff.bg }]}>
              <View style={[styles.diffDot, { backgroundColor: diff.color }]} />
              <Text style={[styles.diffBadgeText, { color: diff.color }]}>{diff.label}</Text>
            </View>
            <Text style={styles.heroTitle} numberOfLines={2}>{spot.nom}</Text>
            <Text style={styles.heroSub}>📍 {spot.localite}</Text>
          </View>
        </View>

        {/* ── Quick stats ── */}
        <View style={styles.statsRow}>
          <StatItem icon="⬇" label="Max" value={`${spot.profondeur_max}m`} color={colors.primary} styles={styles} />
          <View style={styles.statDiv} />
          <StatItem icon="👁" label="Visib." value={`${spot.visibilite}m`} color={colors.emerald} styles={styles} />
          <View style={styles.statDiv} />
          <StatItem icon="🌊" label="Courant" value={spot.courant} color={colors.amber} styles={styles} />
        </View>

        {/* ── Tabs ── */}
        <View style={styles.tabsRow}>
          {[['info','Infos'],['faune','Faune & Flore'],['description','Description']].map(([key, label]) => (
            <TouchableOpacity key={key} style={styles.tab} onPress={() => setActiveTab(key)} activeOpacity={0.75}>
              <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>{label}</Text>
              {activeTab === key && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Contenu ── */}
        <View style={styles.scrollWrap}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {renderTabContent()}
          </ScrollView>

          <View style={styles.ctaRow}>
            <TouchableOpacity style={styles.ctaSecondary} onPress={handleOpenMaps} activeOpacity={0.85}>
              <Text style={styles.ctaSecondaryText}>📍 Itinéraire</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ctaFav, fav && styles.ctaFavActive]}
              onPress={handleToggleFav}
              activeOpacity={0.85}
            >
              <Animated.Text style={[styles.ctaFavIcon, fav && styles.ctaFavIconActive, { transform: [{ scale: favScale }] }]}>
                {fav ? '★' : '☆'}
              </Animated.Text>
              <Text style={[styles.ctaFavText, fav && styles.ctaFavTextActive]}>
                {fav ? 'Sauvegardé' : 'Favoris'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Lightbox ── */}
      <Modal visible={lightboxVisible} transparent animationType="fade" onRequestClose={() => setLightboxVisible(false)} statusBarTranslucent>
        <View style={styles.lbOverlay}>
          <TouchableOpacity style={styles.lbClose} onPress={() => setLightboxVisible(false)}>
            <Text style={styles.lbCloseText}>✕</Text>
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
    </Modal>
  );
};

// Sub-components receive styles as prop to avoid re-calling makeStyles
const InfoRow = ({ label, value, accent }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
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
    <Text style={[styles.statIcon, { color }]}>{icon}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
  </View>
);

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  heroWrap: { height: HERO_H, position: 'relative', backgroundColor: colors.bgCard },
  heroImage: { width: SW, height: HERO_H, backgroundColor: colors.bgCard },
  heroGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: HERO_H * 0.65, backgroundColor: 'transparent',
  },
  closeBtn: { position: 'absolute', top: 48, right: 16, zIndex: 10 },
  closeBtnInner: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(8,12,20,0.55)',
    borderWidth: 1, borderColor: colors.borderMid,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnIcon: { color: '#EEF2FF', fontSize: 14, fontWeight: '700' },
  dotsRow: {
    position: 'absolute', bottom: 80, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { width: 18, backgroundColor: colors.primary, borderRadius: 3 },
  heroBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, paddingBottom: 12, gap: 4,
    backgroundColor: 'rgba(8,12,20,0.82)',
  },
  diffBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radius.pill, marginBottom: 4,
  },
  diffDot: { width: 6, height: 6, borderRadius: 3 },
  diffBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#EEF2FF', letterSpacing: -0.3, lineHeight: 28 },
  heroSub: { fontSize: 13, color: 'rgba(238,242,255,0.60)' },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.bgElevated,
    paddingVertical: 12, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statIcon: { fontSize: 16, marginBottom: 2 },
  statLabel: { fontSize: 9, color: colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' },
  statValue: { fontSize: 12, fontWeight: '700' },
  statDiv: { width: 1, backgroundColor: colors.border, marginVertical: 4 },

  tabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.bgElevated,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', position: 'relative' },
  tabText: { fontSize: 12, fontWeight: '600', color: colors.textMuted, letterSpacing: 0.2 },
  tabTextActive: { color: colors.primary, fontWeight: '700' },
  tabUnderline: {
    position: 'absolute', bottom: 0, left: '20%', right: '20%',
    height: 2, backgroundColor: colors.primary, borderRadius: 1,
  },

  scrollWrap: { flex: 1, position: 'relative' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 110 },

  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: colors.textMuted,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  infoLabel: { fontSize: 14, color: colors.textSecondary },
  infoValue: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, maxWidth: '55%', textAlign: 'right' },

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

  ctaRow: { position: 'absolute', bottom: 20, left: 16, right: 16, flexDirection: 'row', gap: 10 },
  ctaSecondary: {
    flex: 1, paddingVertical: 14, borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.primary,
    alignItems: 'center', backgroundColor: colors.primaryDim,
  },
  ctaSecondaryText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  ctaFav: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 14, borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.amber, backgroundColor: colors.amberDim,
  },
  ctaFavActive: {
    backgroundColor: colors.amber, borderColor: colors.amber,
    shadowColor: colors.amber, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45, shadowRadius: 12, elevation: 8,
  },
  ctaFavIcon: { fontSize: 18, color: colors.amber },
  ctaFavIconActive: { color: colors.bg },
  ctaFavText: { fontSize: 14, fontWeight: '700', color: colors.amber },
  ctaFavTextActive: { color: colors.bg },

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
};

export default DetailSheet;
