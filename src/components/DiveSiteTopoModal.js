/**
 * DiveSiteTopoModal – Fiche Topo & Briefing de Plongée
 * Inspiré des topo-guides de plongée professionnels (Archipel du Frioul - Pomègues)
 * Thème bimodal Ocean Deep Ultra 2026
 */

import React, { useState, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
  StatusBar,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { radius, shadows } from '../theme';
import TopoSiteMap from './TopoSiteMap';
import OutlineIcon from './OutlineIcon';
import { getStraightLineDistance, parseGpsCoords } from '../utils/topoUtils';

const DiveSiteTopoModal = ({ spot, isVisible, onClose, userLocation, onNavigate }) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const [selectedTopoIndex, setSelectedTopoIndex] = useState(0);
  const [selectedPoi, setSelectedPoi] = useState(null);
  const [discoverRequest, setDiscoverRequest] = useState(0);
  const pendingNavigation = useRef(null);

  const navigateAfterDismiss = (key) => {
    pendingNavigation.current = key;
    onClose();
  };

  const topos = useMemo(() => {
    if (!spot || !Array.isArray(spot.topos)) return [];
    return spot.topos;
  }, [spot]);

  const topo = topos[selectedTopoIndex] || topos[0];

  // Distance jusqu'au POI sélectionné (mouillage, épave, etc.)
  const selectedPoiDistance = useMemo(() => {
    if (!selectedPoi || !userLocation?.latitude || !userLocation?.longitude) return null;

    let poiCoords = null;
    if (topo?.geojson?.features) {
      const match = topo.geojson.features.find((f) => {
        const p = f.properties || {};
        return (
          (p.type && (p.type === selectedPoi.type || p.type === selectedPoi.id)) ||
          (p.nom && p.nom === selectedPoi.nom) ||
          (p.titre && p.titre === selectedPoi.nom) ||
          (p.detail && p.detail === selectedPoi.nom) ||
          (p.icon && (p.icon === selectedPoi.icone || (p.icon === 'ancre' && selectedPoi.icone === '⚓')))
        );
      });
      if (match?.geometry) {
        if (match.geometry.type === 'Point' && Array.isArray(match.geometry.coordinates)) {
          poiCoords = { latitude: match.geometry.coordinates[1], longitude: match.geometry.coordinates[0] };
        } else if (match.geometry.type === 'Polygon' && Array.isArray(match.geometry.coordinates?.[0])) {
          const coords = match.geometry.coordinates[0];
          const lat = coords.reduce((acc, c) => acc + c[1], 0) / coords.length;
          const lng = coords.reduce((acc, c) => acc + c[0], 0) / coords.length;
          poiCoords = { latitude: lat, longitude: lng };
        }
      }
    }

    if (!poiCoords) {
      poiCoords = parseGpsCoords(topo?.coordonnees_gps, spot?.latitude, spot?.longitude);
    }

    if (!poiCoords) return null;
    return getStraightLineDistance(userLocation, poiCoords, false);
  }, [selectedPoi, userLocation, topo, spot]);

  const handleShareTopo = async () => {
    const stepsText = (topo.parcours || [])
      .map((step, idx) => `${step.ordre || (idx + 1)}. ${step.titre || 'Étape'} (${step.profondeur || ''}) - ${step.action || ''}`)
      .join('\n');

    const poisText = (topo.pois || [])
      .map(p => `${p.icone || '📍'} ${p.nom} (${p.profondeur}m)`)
      .join(', ');

    const message = [
      `🤿 Briefing Topo : ${topo.titre || spot.nom}`,
      spot.localite ? `📍 Localité : ${spot.localite}` : null,
      spot.profondeur_max ? `⬇ Profondeur max : ${spot.profondeur_max}m` : null,
      '',
      '📋 Parcours d\'immersion :',
      stepsText,
      '',
      poisText ? `📍 Repères clés : ${poisText}` : null,
      '',
      '📱 Retrouvez ce briefing de plongée sur l\'application Diving Spots Map !',
    ].filter(Boolean).join('\n');

    try {
      await Share.share(
        {
          title: `Briefing Topo - ${spot.nom}`,
          message,
        },
        {
          dialogTitle: `Partager le briefing de ${spot.nom}`,
        }
      );
    } catch (error) {
      console.log('Erreur de partage :', error);
    }
  };

  if (!spot || topos.length === 0) return null;

  return (
    <Modal visible={isVisible} animationType="slide" transparent={false} onRequestClose={onClose} onDismiss={() => {
      const next = pendingNavigation.current;
      pendingNavigation.current = null;
      if (next) onNavigate?.(next);
    }}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

        {/* ── En-tête Navigation ── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <OutlineIcon name="chevron-back-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <View style={styles.badgeRow}>
              <View style={styles.badgeTopo}>
                <Text style={styles.badgeTopoText}>TOPO & BRIEFING SOUS-MARIN</Text>
              </View>
            </View>
            <Text style={styles.title} numberOfLines={2}>{spot.nom}</Text>
            <View style={styles.locationRow}>
              <OutlineIcon name="location-outline" size={15} color={colors.textSecondary} />
              <Text style={styles.subTitle} numberOfLines={1}>{spot.localite}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShareTopo} activeOpacity={0.8}>
            <Ionicons name="share-social-outline" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* ── Spots de plongée du lieu ── */}
        <View style={styles.topoSelectorWrap}>
          <Text style={styles.topoSelectorTitle}>Spots de plongée</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topoSelectorScroll}>
              {topos.map((t, idx) => (
                <TouchableOpacity
                  key={t.id || idx}
                  style={[styles.topoTab, selectedTopoIndex === idx && styles.topoTabActive]}
                  onPress={() => {
                    setSelectedTopoIndex(idx);
                    setSelectedPoi(null);
                  }}
                  activeOpacity={0.8}
                >
                  {selectedTopoIndex === idx ? (
                    <LinearGradient colors={colors.gradPrimary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.topoTabInner}>
                      <Text style={styles.topoTabEyebrow}>SPOT SÉLECTIONNÉ</Text>
                      <Text style={styles.topoTabTextActive} numberOfLines={2}>{t.titre}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.topoTabInner}>
                      <Text style={styles.topoTabText} numberOfLines={2}>{t.titre}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ── Carte Topographique / Bathymétrique (Composant Dédié TopoSiteMap) ── */}
          <TopoSiteMap topo={topo} spot={spot} userLocation={userLocation} discoverRequest={discoverRequest} />



          {/* ── Points d'Intérêt Sous-Marins (POIs) ── */}
          {topo.pois && topo.pois.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <OutlineIcon name="location-outline" size={24} color={colors.primary} />
                  <Text style={styles.cardTitle} numberOfLines={2}>Points d'Intérêt Clés du Site</Text>
                </View>
                <Text style={styles.poiCountBadge} numberOfLines={2}>{topo.pois.length} Points d'Intérêt</Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.poiScroll}>
                {topo.pois.map((poi) => {
                  const isSelected = selectedPoi?.id === poi.id;
                  return (
                    <TouchableOpacity
                      key={poi.id || poi.nom}
                      style={[styles.poiCard, isSelected && styles.poiCardActive]}
                      onPress={() => setSelectedPoi(isSelected ? null : poi)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.poiTopRow}>
                        <OutlineIcon name={poi.icone || 'location-outline'} size={25} color={colors.primary} />
                        <View style={[styles.depthTag, poi.type === 'danger' && styles.depthTagDanger]}>
                          <Text style={[styles.depthTagText, poi.type === 'danger' && styles.depthTagDangerText]}>
                            {poi.profondeur} m
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.poiName} numberOfLines={2}>{poi.nom}</Text>
                      <Text style={styles.poiType}>{poi.type?.toUpperCase() || 'REPÈRE'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Détail du POI sélectionné */}
              {selectedPoi && (
                <View style={styles.selectedPoiBox}>
                  <View style={styles.selectedPoiHeader}>
                    <View style={styles.selectedPoiTitleCol}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 }}><OutlineIcon name={selectedPoi.icone || 'location-outline'} size={19} color={colors.primary} /><Text style={styles.selectedPoiTitle} numberOfLines={2}>{selectedPoi.nom} ({selectedPoi.profondeur} m)</Text></View>
                      {selectedPoiDistance && (
                        <Text style={styles.selectedPoiDistanceText}>
                          À {selectedPoiDistance}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => setSelectedPoi(null)}>
                      <OutlineIcon name="close-outline" size={22} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.selectedPoiDesc}>{selectedPoi.description || "Point remarquable du parcours sous-marin."}</Text>
                </View>
              )}
            </View>
          )}

          {/* ── Parcours d'Immersion & Briefing Tactique ── */}
          {topo.parcours && topo.parcours.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <OutlineIcon name="compass-outline" size={24} color={colors.primary} />
                  <Text style={styles.cardTitle} numberOfLines={2}>Parcours d'Immersion Recommandé</Text>
                </View>
                <View style={styles.safetyPill}>
                  <Text style={styles.safetyPillText}>SÉCURITÉ</Text>
                </View>
              </View>

              <View style={styles.timeline}>
                {topo.parcours.map((step, idx) => {
                  const isLast = idx === (topo.parcours.length - 1);
                  const isPalier = step.profondeur?.includes('5') || step.titre?.toLowerCase().includes('palier');
                  return (
                    <View key={idx} style={styles.timelineItem}>
                      <View style={styles.timelineLineCol}>
                        <View style={[styles.timelineNode, isPalier && styles.timelineNodePalier]}>
                          <Text style={styles.timelineNodeText}>{step.ordre || (idx + 1)}</Text>
                        </View>
                        {!isLast && <View style={styles.timelineLine} />}
                      </View>

                      <View style={styles.timelineContent}>
                        <View style={styles.timelineHeader}>
                          <Text style={styles.timelineTitle} numberOfLines={3}>{step.titre || `Étape ${idx + 1}`}</Text>
                          <View style={[styles.timelineDepthBadge, isPalier && styles.timelineDepthBadgePalier]}>
                            <Text style={[styles.timelineDepthText, isPalier && styles.timelineDepthTextPalier]} numberOfLines={1} adjustsFontSizeToFit>
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
          )}


          <View style={{ height: 30 }} />
        </ScrollView>

        {/* ── Barre d'Action Inférieure ── */}
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.btnSecondary} onPress={handleShareTopo} activeOpacity={0.85}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><OutlineIcon name="share-social-outline" size={21} color={colors.primary} /><Text style={styles.btnSecondaryText}>Partager</Text></View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => setDiscoverRequest((current) => current + 1)} activeOpacity={0.85}>
            <LinearGradient colors={colors.gradPrimary} style={styles.btnPrimaryGrad}>
              <Text style={styles.btnPrimaryText}>Découvrir</Text>
              <OutlineIcon name="arrow-forward-outline" size={20} color="#03111F" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

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
    backgroundColor: colors.bg,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.bgElevated,
    borderWidth: 1, borderColor: colors.borderMid,
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
    minWidth: 0,
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
  topoSelectorWrap: {
    backgroundColor: colors.bgElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topoSelectorTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  topoSelectorScroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 8,
  },
  topoTab: {
    width: 190,
    minHeight: 64,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderMid,
  },
  topoTabActive: {
    width: 236,
    borderColor: colors.primary,
    borderWidth: 2,
  },
  topoTabInner: {
    minHeight: 62,
    paddingHorizontal: 14,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  topoTabEyebrow: {
    fontSize: 10,
    color: '#03111F',
    fontWeight: '900',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  topoTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  topoTabTextActive: {
    fontSize: 14,
    color: '#03111F',
    fontWeight: '800',
  },

  title: {
    fontSize: 19,
    lineHeight: 23,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  subTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderMid,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 14,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  cardIcon: {
    fontSize: 18,
  },
  cardTitle: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 17,
    fontWeight: '800',
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
  topoMap: {
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
    maxWidth: 82,
    flexShrink: 0,
    textAlign: 'right',
  },
  poiScroll: {
    gap: 12,
    paddingVertical: 4,
  },
  poiCard: {
    width: 150,
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    borderRadius: radius.md || 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: colors.borderMid,
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
  selectedPoiTitleCol: {
    flex: 1,
    marginRight: 8,
  },
  selectedPoiTitle: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  selectedPoiDistanceText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary || '#00E5FF',
    marginTop: 2,
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
    flexShrink: 0,
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
    minWidth: 0,
    marginLeft: 12,
    paddingBottom: 16,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
    gap: 8,
  },
  timelineTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  timelineDepthBadge: {
    backgroundColor: colors.primaryDim || 'rgba(0,229,255,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    flexShrink: 0,
    maxWidth: 80,
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
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  btnSecondary: {
    flex: 1,
    height: 48,
    borderRadius: radius.lg || 14,
    borderWidth: 1,
    borderColor: colors.borderBright || 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
  },
  btnSecondaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  shareBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.bgGlassStrong || 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  shareBtnIcon: {
    fontSize: 16,
  },
  btnPrimary: {
    flex: 1,
    height: 48,
    borderRadius: radius.lg || 14,
    overflow: 'hidden',
  },
  btnPrimaryGrad: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnPrimaryText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#03111F',
  },
  fullscreenMapSafeArea: {
    flex: 1,
    backgroundColor: isDark ? '#050A10' : '#111827',
  },
  fullscreenMapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: isDark ? 'rgba(5,10,16,0.95)' : '#1F2937',
    zIndex: 10,
  },
  fullscreenCloseBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill || 999,
  },
  fullscreenCloseBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
  fullscreenMapTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  fullscreenMapContainer: {
    flex: 1,
  },
  fullscreenMap: {
    width: '100%',
    height: '100%',
  },
});

DiveSiteTopoModal.propTypes = {
  spot: PropTypes.object,
  isVisible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  userLocation: PropTypes.object,
  onNavigate: PropTypes.func,
};

export default DiveSiteTopoModal;
