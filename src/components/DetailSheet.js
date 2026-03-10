/**
 * Composant DetailSheet - Affiche les détails complets d'un spot de plongée
 */

import React, { useState, useRef } from 'react';
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
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const DetailSheet = ({ spot, isVisible, onClose }) => {
  const [activeTab, setActiveTab] = useState('info');
  const [photoIndex, setPhotoIndex] = useState(0);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (!spot) return null;

  // Toutes les photos : photo principale + photos fond marin (dédoublonnées)
  const allPhotos = [spot.photo, ...(spot.photos_fond_marin || [])].filter(
    (uri, idx, arr) => uri && arr.indexOf(uri) === idx
  );

  const handleCarouselScroll = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setPhotoIndex(Math.max(0, Math.min(idx, allPhotos.length - 1)));
  };

  const openLightbox = (idx) => {
    setLightboxIndex(idx);
    setLightboxVisible(true);
  };

  const handleLightboxScroll = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setLightboxIndex(Math.max(0, Math.min(idx, allPhotos.length - 1)));
  };

  const handleOpenMaps = () => {
    if (!spot.latitude || !spot.longitude) {
      Alert.alert("Erreur", "Coordonnées GPS non disponibles");
      return;
    }
    const label = encodeURIComponent(spot.nom);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${spot.latitude},${spot.longitude}`,
      android: `geo:0,0?q=${spot.latitude},${spot.longitude}(${label})`,
    });

    Linking.openURL(url).catch((err) => {
      Alert.alert('Erreur', 'Impossible d\'ouvrir la carte');
    });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'info':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Informations Générales</Text>
            <InfoRow label="Type de site" value={spot.type_site} />
            <InfoRow label="Localité" value={spot.localite} />
            <InfoRow label="Code postal" value={spot.code_postal} />
            <InfoRow label="Difficulté" value={spot.difficulte} />
            <InfoRow label="Meilleure saison" value={spot.meilleure_saison} />

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Conditions de Plongée</Text>
            <InfoRow label="Profondeur min" value={`${spot.profondeur_min} m`} />
            <InfoRow label="Profondeur max" value={`${spot.profondeur_max} m`} />
            <InfoRow label="Visibilité" value={`${spot.visibilite} m`} />
            <InfoRow label="Courant" value={spot.courant} />

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Accès et Tarifs</Text>
            <InfoRow label="Conditions d'accès" value={spot.conditions_acces} />
            <InfoRow label="Capacité" value={`${spot.capacite_plongeurs} plongeurs max`} />
          </View>
        );

      case 'fauna':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>🐠 Faune Observée</Text>
            <View style={styles.tagsContainer}>
              {spot.faune?.map((animal, idx) => (
                <View key={idx} style={styles.tag}>
                  <Text style={styles.tagText}>{animal}</Text>
                </View>
              ))}
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>🌿 Flore Observée</Text>
            <View style={styles.tagsContainer}>
              {spot.flore?.map((plant, idx) => (
                <View key={idx} style={styles.tag}>
                  <Text style={styles.tagText}>{plant}</Text>
                </View>
              ))}
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>📸 Photos Sous-Marines</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoGallery}>
              {spot.photos_fond_marin?.map((photoUrl, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => openLightbox(allPhotos.indexOf(photoUrl) >= 0 ? allPhotos.indexOf(photoUrl) : 0)}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: photoUrl }} style={styles.galleryPhoto} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        );

      case 'description':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{spot.description}</Text>

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Coordonnées GPS</Text>
            <View style={styles.gpsBox}>
              <Text style={styles.gpsLabel}>Latitude :</Text>
              <Text style={styles.gpsValue}>{spot.latitude ? spot.latitude.toFixed(4) : 'N/A'}</Text>
              <Text style={[styles.gpsLabel, { marginTop: 10 }]}>Longitude :</Text>
              <Text style={styles.gpsValue}>{spot.longitude ? spot.longitude.toFixed(4) : 'N/A'}</Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{spot.nom}</Text>
          <View style={styles.closeButtonPlaceholder} />
        </View>

        {/* ── Carousel de photos avec dots ── */}
        <View style={styles.photoContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleCarouselScroll}
            scrollEventThrottle={16}
          >
            {allPhotos.map((uri, idx) => (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.92}
                onPress={() => openLightbox(idx)}
              >
                <Image source={{ uri }} style={styles.detailImage} resizeMode="cover" />
                {idx > 0 && (
                  <View style={styles.pinBadge}>
                    <Text style={styles.pinBadgeText}>📌</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {allPhotos.length > 1 && (
            <View style={styles.dotsRow}>
              {allPhotos.map((_, idx) => (
                <View key={idx} style={[styles.dot, idx === photoIndex && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>

        {/* ── Quick Info ── */}
        <View style={styles.quickInfo}>
          <QuickInfoItem icon="📏" label="Profondeur" value={`${spot.profondeur_min}–${spot.profondeur_max}m`} />
          <View style={styles.quickInfoDivider} />
          <QuickInfoItem icon="👁️" label="Visibilité" value={`${spot.visibilite}m`} />
          <View style={styles.quickInfoDivider} />
          <QuickInfoItem icon="⚡" label="Difficulté" value={spot.difficulte || '—'} />
        </View>

        {/* ── Onglets ── */}
        <View style={styles.tabsContainer}>
          <TabButton title="Infos"         active={activeTab === 'info'}        onPress={() => setActiveTab('info')} />
          <TabButton title="Faune & Flore" active={activeTab === 'fauna'}       onPress={() => setActiveTab('fauna')} />
          <TabButton title="Description"   active={activeTab === 'description'} onPress={() => setActiveTab('description')} />
        </View>

        {/* ── Contenu scrollable + boutons flottants ── */}
        <View style={styles.scrollWrapper}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContentContainer}
          >
            {renderTabContent()}
          </ScrollView>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.navButton} onPress={handleOpenMaps} activeOpacity={0.8}>
              <Text style={styles.navButtonText}>📍</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.reserveButton} activeOpacity={0.8}>
              <Text style={styles.reserveButtonText}>🗓 Réserver</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Lightbox (zoom + swipe) ── */}
      <Modal
        visible={lightboxVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxVisible(false)}
        statusBarTranslucent
      >
        <View style={styles.lightboxOverlay}>
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setLightboxVisible(false)}>
            <Text style={styles.lightboxCloseText}>✕</Text>
          </TouchableOpacity>

          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleLightboxScroll}
            scrollEventThrottle={16}
            contentOffset={{ x: lightboxIndex * SCREEN_WIDTH, y: 0 }}
            style={styles.lightboxScroll}
          >
            {allPhotos.map((uri, idx) => (
              <View key={idx} style={styles.lightboxSlide}>
                <Image source={{ uri }} style={styles.lightboxImage} resizeMode="contain" />
              </View>
            ))}
          </ScrollView>

          <View style={styles.lightboxFooter}>
            <Text style={styles.lightboxCounter}>{lightboxIndex + 1} / {allPhotos.length}</Text>
            <View style={styles.dotsRow}>
              {allPhotos.map((_, idx) => (
                <View key={idx} style={[styles.dot, styles.dotLight, idx === lightboxIndex && styles.dotActiveLightbox]} />
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

/* ─── Sub-components ─── */

const InfoRow = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const QuickInfoItem = ({ icon, label, value }) => (
  <View style={styles.quickInfoItem}>
    <Text style={styles.quickInfoIcon}>{icon}</Text>
    <Text style={styles.quickInfoLabel}>{label}</Text>
    <Text style={styles.quickInfoValue}>{value}</Text>
  </View>
);

const TabButton = ({ title, active, onPress }) => (
  <TouchableOpacity
    style={[styles.tabButton, active && styles.tabButtonActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>{title}</Text>
  </TouchableOpacity>
);

/* ─── Styles ─── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    marginTop: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#13131D',
    marginHorizontal: 16,
    textAlign: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 22,
    color: '#13131D',
  },
  closeButtonPlaceholder: {
    width: 40,
  },

  /* Carousel */
  photoContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#222',
  },
  detailImage: {
    width: SCREEN_WIDTH,
    height: 200,
    backgroundColor: '#E8E8E8',
  },
  pinBadge: {
    position: 'absolute',
    top: 8,
    left: 10,
  },
  pinBadgeText: {
    fontSize: 20,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  dotsRow: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 18,
    borderRadius: 4,
  },
  dotLight: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActiveLightbox: {
    backgroundColor: '#FFFFFF',
    width: 18,
  },

  /* Quick Info */
  quickInfo: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  quickInfoItem: {
    alignItems: 'center',
    flex: 1,
  },
  quickInfoIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  quickInfoLabel: {
    fontSize: 9,
    color: '#999',
    marginBottom: 1,
  },
  quickInfoValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#13131D',
  },
  quickInfoDivider: {
    width: 1,
    height: '60%',
    backgroundColor: '#E0E0E0',
    alignSelf: 'center',
  },

  /* Tabs */
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#4A90E2',
    backgroundColor: '#F0F6FF',
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    letterSpacing: 0.2,
  },
  tabButtonTextActive: {
    color: '#4A90E2',
  },

  /* Scroll */
  scrollWrapper: {
    flex: 1,
    position: 'relative',
  },
  scrollContentContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 100,
  },
  tabContent: {
    paddingBottom: 8,
  },

  /* Content */
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#13131D',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6C7383',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#13131D',
    maxWidth: '55%',
    textAlign: 'right',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#EBF2FF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A90E2',
  },
  descriptionText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 24,
    marginBottom: 16,
  },
  gpsBox: {
    backgroundColor: '#EBF2FF',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  gpsLabel: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '600',
    marginBottom: 4,
  },
  gpsValue: {
    fontSize: 15,
    color: '#13131D',
    fontWeight: 'bold',
    fontFamily: 'Courier New',
  },
  photoGallery: {
    marginTop: 12,
    paddingVertical: 8,
  },
  galleryPhoto: {
    width: 160,
    height: 110,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: '#E8F4F8',
  },

  /* Floating buttons */
  actionButtons: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  navButton: {
    width: 50,
    height: 50,
    backgroundColor: '#4A90E2',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  navButtonText: {
    fontSize: 22,
  },
  reserveButton: {
    paddingVertical: 13,
    paddingHorizontal: 20,
    backgroundColor: '#FF6B6B',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  reserveButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Lightbox */
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
  },
  lightboxClose: {
    position: 'absolute',
    top: 52,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxCloseText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  lightboxScroll: {
    flex: 1,
  },
  lightboxSlide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
  },
  lightboxFooter: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 10,
  },
  lightboxCounter: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
});

DetailSheet.propTypes = {
  spot: PropTypes.object,
  isVisible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

DetailSheet.defaultProps = {
  spot: null,
};

export default DetailSheet;
