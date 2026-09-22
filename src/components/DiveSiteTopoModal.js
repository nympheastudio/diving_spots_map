/**
 * DiveSiteTopoModal – Fiche Topo & Briefing de Plongée
 * Inspiré des topo-guides de plongée professionnels (Archipel du Frioul - Pomègues)
 * Thème bimodal Ocean Deep Ultra 2026
 */

import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  ScrollView,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { radius, shadows } from '../theme';
import ZoomableTopoViewer from './ZoomableTopoViewer';

// Assets locaux disponibles pour les topos
const TOPO_LOCAL_ASSETS = {
  'topo-frioul-pomegues.jpg': require('../../assets/topo-frioul-pomegues.jpg'),
};


const DiveSiteTopoModal = ({ spot, isVisible, onClose }) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const [selectedPoi, setSelectedPoi] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(false);

  if (!spot || !spot.topo) return null;

  const topo = spot.topo;

  const imageSource = topo.plan_image && TOPO_LOCAL_ASSETS[topo.plan_image]
    ? TOPO_LOCAL_ASSETS[topo.plan_image]
    : (topo.plan_image ? { uri: topo.plan_image } : { uri: spot.photo });



  return (
    <Modal visible={isVisible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
        
        {/* ── En-tête Navigation ── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <View style={styles.badgeRow}>
              <View style={styles.badgeTopo}>
                <Text style={styles.badgeTopoText}>TOPO & BRIEFING SOUS-MARIN</Text>
              </View>
              {topo.coordonnees_gps && (
                <Text style={styles.gpsText}>📍 {topo.coordonnees_gps}</Text>
              )}
            </View>
            <Text style={styles.title} numberOfLines={1}>{topo.titre || spot.nom}</Text>
            {topo.sous_titre && <Text style={styles.subTitle} numberOfLines={1}>{topo.sous_titre}</Text>}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ── Carte Topographique / Bathymétrique ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Text style={styles.cardIcon}>🗺️</Text>
                <Text style={styles.cardTitle}>Plan Bathymétrique & Reliefs</Text>
              </View>
              <TouchableOpacity
                style={styles.zoomButton}
                onPress={() => setFullscreenImage(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.zoomButtonText}>🔍 Agrandir</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.95}
              onPress={() => setFullscreenImage(true)}
              onTouchStart={(e) => {
                if (e.nativeEvent.touches && e.nativeEvent.touches.length >= 2) {
                  setFullscreenImage(true);
                }
              }}
              style={styles.imageContainer}
            >
              <Image source={imageSource} style={styles.topoImage} resizeMode="contain" />
              
              {/* Overlay d'information sur la carte */}
              <LinearGradient
                colors={['transparent', 'rgba(5,10,16,0.85)']}
                style={styles.imageOverlay}
              >
                <View style={styles.overlayInfoRow}>
                  <Text style={styles.overlayLegend}>Zone balisée • Échelle 50m</Text>
                  <Text style={styles.overlayHint}>🔍 Appuyez ou pincez pour zoomer</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

          </View>

          {/* ── Points d'Intérêt Sous-Marins (POIs) ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Text style={styles.cardIcon}>📍</Text>
                <Text style={styles.cardTitle}>Points d'Intérêt Clés du Site</Text>
              </View>
              <Text style={styles.poiCountBadge}>{topo.pois?.length || 0} repères</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.poiScroll}>
              {(topo.pois || []).map((poi) => {
                const isSelected = selectedPoi?.id === poi.id;
                return (
                  <TouchableOpacity
                    key={poi.id || poi.nom}
                    style={[styles.poiCard, isSelected && styles.poiCardActive]}
                    onPress={() => setSelectedPoi(isSelected ? null : poi)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.poiTopRow}>
                      <Text style={styles.poiIcon}>{poi.icone || '📍'}</Text>
                      <View style={[styles.depthTag, poi.type === 'danger' && styles.depthTagDanger]}>
                        <Text style={[styles.depthTagText, poi.type === 'danger' && styles.depthTagDangerText]}>
                          {poi.profondeur} m
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.poiName} numberOfLines={1}>{poi.nom}</Text>
                    <Text style={styles.poiType}>{poi.type?.toUpperCase() || 'REPÈRE'}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Détail du POI sélectionné */}
            {selectedPoi && (
              <View style={styles.selectedPoiBox}>
                <View style={styles.selectedPoiHeader}>
                  <Text style={styles.selectedPoiTitle}>{selectedPoi.icone} {selectedPoi.nom} ({selectedPoi.profondeur} m)</Text>
                  <TouchableOpacity onPress={() => setSelectedPoi(null)}>
                    <Text style={styles.selectedPoiClose}>✕</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.selectedPoiDesc}>{selectedPoi.description || "Point remarquable du parcours sous-marin."}</Text>
              </View>
            )}
          </View>

          {/* ── Parcours d'Immersion & Briefing Tactique ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Text style={styles.cardIcon}>🧭</Text>
                <Text style={styles.cardTitle}>Parcours d'Immersion Recommandé</Text>
              </View>
              <View style={styles.safetyPill}>
                <Text style={styles.safetyPillText}>SÉCURITÉ</Text>
              </View>
            </View>

            <View style={styles.timeline}>
              {(topo.parcours || []).map((step, idx) => {
                const isLast = idx === (topo.parcours.length - 1);
                const isPalier = step.profondeur?.includes('5') || step.titre?.toLowerCase().includes('palier');
                return (
                  <View key={idx} style={styles.timelineItem}>
                    {/* Colonne visuelle : cercle et ligne connectrice */}
                    <View style={styles.timelineLineCol}>
                      <View style={[styles.timelineNode, isPalier && styles.timelineNodePalier]}>
                        <Text style={styles.timelineNodeText}>{step.ordre || (idx + 1)}</Text>
                      </View>
                      {!isLast && <View style={styles.timelineLine} />}
                    </View>

                    {/* Contenu de l'étape */}
                    <View style={styles.timelineContent}>
                      <View style={styles.timelineHeader}>
                        <Text style={styles.timelineTitle}>{step.titre || `Étape ${idx + 1}`}</Text>
                        <View style={[styles.timelineDepthBadge, isPalier && styles.timelineDepthBadgePalier]}>
                          <Text style={[styles.timelineDepthText, isPalier && styles.timelineDepthTextPalier]}>
                            {step.profondeur}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.timelineAction}>{step.action}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>


          <View style={{ height: 30 }} />
        </ScrollView>

        {/* ── Barre d'Action Inférieure ── */}
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.btnPrimary} onPress={onClose} activeOpacity={0.85}>
            <LinearGradient colors={colors.gradPrimary} style={styles.btnPrimaryGrad}>
              <Text style={styles.btnPrimaryText}>Terminer le briefing</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ── Visualiseur Plein Écran Zoomable & Déplaçable de la Carte ── */}
        <Modal
          visible={fullscreenImage}
          transparent
          animationType="fade"
          onRequestClose={() => setFullscreenImage(false)}
        >
          <ZoomableTopoViewer
            source={imageSource}
            title={`${topo.titre || spot.nom} – Plan bathymétrique`}
            onClose={() => setFullscreenImage(false)}
          />
        </Modal>

      </SafeAreaView>
    </Modal>
  );
};

DiveSiteTopoModal.propTypes = {
  spot: PropTypes.object,
  isVisible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

const makeStyles = (colors, isDark) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.bgGlassStrong || 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  closeBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerTitles: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  badgeTopo: {
    backgroundColor: colors.primaryDim || 'rgba(0,229,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill || 999,
  },
  badgeTopoText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.6,
  },
  gpsText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  subTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl || 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardIcon: {
    fontSize: 18,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  zoomButton: {
    backgroundColor: colors.primaryDim || 'rgba(0,229,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill || 999,
  },
  zoomButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  imageContainer: {
    width: '100%',
    height: 240,
    borderRadius: radius.lg || 14,
    overflow: 'hidden',
    backgroundColor: isDark ? '#050A10' : '#E8EEF8',
    position: 'relative',
  },
  topoImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 50,
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  overlayInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overlayLegend: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
  },
  overlayHint: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
  },
  poiCountBadge: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  poiScroll: {
    gap: 12,
    paddingVertical: 4,
  },
  poiCard: {
    width: 140,
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    borderRadius: radius.md || 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  poiCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryDim || 'rgba(0,229,255,0.15)',
  },
  poiTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  poiIcon: {
    fontSize: 22,
  },
  depthTag: {
    backgroundColor: colors.primaryDim || 'rgba(0,229,255,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  depthTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  depthTagDanger: {
    backgroundColor: 'rgba(255,71,87,0.2)',
  },
  depthTagDangerText: {
    color: '#FF4757',
  },
  poiName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  poiType: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  selectedPoiBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.primaryDim || 'rgba(0,229,255,0.1)',
    borderRadius: radius.md || 10,
    borderWidth: 1,
    borderColor: colors.primaryMid || 'rgba(0,229,255,0.3)',
  },
  selectedPoiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  selectedPoiTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  selectedPoiClose: {
    fontSize: 14,
    color: colors.textSecondary,
    padding: 2,
  },
  selectedPoiDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  safetyPill: {
    backgroundColor: colors.emeraldDim || 'rgba(0,229,160,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill || 999,
  },
  safetyPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.emerald || '#00E5A0',
    letterSpacing: 0.5,
  },
  timeline: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 52,
  },
  timelineLineCol: {
    alignItems: 'center',
    width: 28,
  },
  timelineNode: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  timelineNodePalier: {
    backgroundColor: colors.emerald || '#00E5A0',
  },
  timelineNodeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.borderBright || 'rgba(255,255,255,0.2)',
    marginVertical: 2,
  },
  timelineContent: {
    flex: 1,
    marginLeft: 12,
    paddingBottom: 16,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  timelineDepthBadge: {
    backgroundColor: colors.primaryDim || 'rgba(0,229,255,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  timelineDepthBadgePalier: {
    backgroundColor: colors.emeraldDim || 'rgba(0,229,160,0.15)',
  },
  timelineDepthText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  timelineDepthTextPalier: {
    color: colors.emerald || '#00E5A0',
  },
  timelineAction: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  bottomBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.bgElevated,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },

  btnPrimary: {
    flex: 1,
    height: 48,
    borderRadius: radius.lg || 14,
    overflow: 'hidden',
  },
  btnPrimaryGrad: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
});



export default DiveSiteTopoModal;
