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
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { radius, shadows } from '../theme';

const { width: SW, height: SH } = Dimensions.get('window');

// Assets locaux disponibles pour les topos
const TOPO_LOCAL_ASSETS = {
  'topo-frioul-pomegues.jpg': require('../../assets/topo-frioul-pomegues.jpg'),
};

/**
 * Composant de visualisation interactive plein écran.
 * iOS : ScrollView natif UIKit (minimumZoomScale/maximumZoomScale).
 * Android : événements touch natifs (onTouchStart/onTouchMove/onTouchEnd)
 *           qui accèdent directement à tous les doigts simultanément.
 */
const ZoomableTopoViewer = ({ source, title, onClose }) => {
  const isIOS = Platform.OS === 'ios';
  const [displayScale, setDisplayScale] = useState(1);

  // iOS
  const scrollRef = useRef(null);

  // Android – valeurs animées
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const transX     = useRef(new Animated.Value(0)).current;
  const transY     = useRef(new Animated.Value(0)).current;

  // Android – état gestuel (pas de setState pour éviter le re-render pendant le geste)
  const gs = useRef({
    scale: 1,
    panX: 0,
    panY: 0,
    // pinch
    pinchActive: false,
    pinchStartDist: 0,
    pinchStartScale: 1,
    // double-tap
    lastTapTs: 0,
    // pan
    lastTouchX: 0,
    lastTouchY: 0,
    // flag pour ignorer le premier déplacement après la fin du pinch
    justEndedPinch: false,
  });

  // ── Helpers iOS ─────────────────────────────────────────────
  const zoomIOS = (target) => {
    const s = Math.min(Math.max(1, target), 5);
    setDisplayScale(s);
    const ref = scrollRef.current;
    if (ref && typeof ref.scrollResponderZoomTo === 'function') {
      const w = (SW - 16) / s;
      const h = (SH * 0.7) / s;
      ref.scrollResponderZoomTo({ x: ((SW - 16) - w) / 2, y: (SH * 0.7 - h) / 2, width: w, height: h, animated: true });
    }
  };

  // ── Helpers Android ─────────────────────────────────────────
  const applyZoomAndroid = (target, animated = true) => {
    const s = Math.min(Math.max(1, target), 5);
    const state = gs.current;
    state.scale = s;
    if (s <= 1.01) {
      state.panX = 0; state.panY = 0;
    } else {
      const maxX = ((SW - 16) * (s - 1)) / 2;
      const maxY = ((SH * 0.7) * (s - 1)) / 2;
      state.panX = Math.min(Math.max(-maxX, state.panX), maxX);
      state.panY = Math.min(Math.max(-maxY, state.panY), maxY);
    }
    setDisplayScale(s);
    if (animated) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: s <= 1.01 ? 1 : s, useNativeDriver: true, friction: 7, tension: 40 }),
        Animated.spring(transX,    { toValue: state.panX,         useNativeDriver: true, friction: 7, tension: 40 }),
        Animated.spring(transY,    { toValue: state.panY,         useNativeDriver: true, friction: 7, tension: 40 }),
      ]).start();
    } else {
      scaleAnim.setValue(s <= 1.01 ? 1 : s);
      transX.setValue(state.panX);
      transY.setValue(state.panY);
    }
  };

  const applyZoom = (target) => isIOS ? zoomIOS(target) : applyZoomAndroid(target);

  // ── Calcul de distance entre deux doigts ──────────────────
  const touchDist = (touches) => {
    const dx = touches[0].pageX - touches[1].pageX;
    const dy = touches[0].pageY - touches[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // ── Gestionnaires touch Android ──────────────────────────────
  const onTouchStart = (e) => {
    const touches = e.nativeEvent.touches;
    const state = gs.current;

    if (touches.length >= 2) {
      state.pinchActive     = true;
      state.pinchStartDist  = touchDist(touches);
      state.pinchStartScale = state.scale;
    } else if (touches.length === 1) {
      state.pinchActive  = false;
      state.lastTouchX   = touches[0].pageX;
      state.lastTouchY   = touches[0].pageY;
    }
  };

  const onTouchMove = (e) => {
    const touches = e.nativeEvent.touches;
    const state = gs.current;

    if (touches.length >= 2) {
      // ── Pinch ──
      if (!state.pinchActive || state.pinchStartDist === 0) {
        state.pinchActive     = true;
        state.pinchStartDist  = touchDist(touches);
        state.pinchStartScale = state.scale;
        return;
      }
      const d = touchDist(touches);
      const newScale = Math.min(Math.max(1, state.pinchStartScale * (d / state.pinchStartDist)), 5);
      state.scale = newScale;
      scaleAnim.setValue(newScale);
      // Mise à jour du badge seulement si le changement est perceptible (>1%)
      if (Math.abs(newScale - displayScale) > 0.01) {
        setDisplayScale(Math.round(newScale * 100) / 100);
      }
    } else if (touches.length === 1) {
      // Transition pinch → 1 doigt : réinitialiser le point de référence du pan
      // et ignorer ce premier événement pour éviter le saut
      if (state.pinchActive) {
        state.pinchActive     = false;
        state.pinchStartDist  = 0;
        state.justEndedPinch  = true;
        state.lastTouchX      = touches[0].pageX;
        state.lastTouchY      = touches[0].pageY;
        return;
      }

      if (state.justEndedPinch) {
        // Absorber le premier événement de mouvement post-pinch
        state.justEndedPinch = false;
        state.lastTouchX     = touches[0].pageX;
        state.lastTouchY     = touches[0].pageY;
        return;
      }

      // ── Pan normal ──
      if (state.scale > 1.05) {
        const tx = touches[0].pageX;
        const ty = touches[0].pageY;
        const dx = tx - state.lastTouchX;
        const dy = ty - state.lastTouchY;
        state.lastTouchX = tx;
        state.lastTouchY = ty;

        const maxX = ((SW - 16) * (state.scale - 1)) / 2;
        const maxY = ((SH * 0.7) * (state.scale - 1)) / 2;
        state.panX = Math.min(Math.max(-maxX, state.panX + dx), maxX);
        state.panY = Math.min(Math.max(-maxY, state.panY + dy), maxY);
        transX.setValue(state.panX);
        transY.setValue(state.panY);
      }
    }
  };

  const onTouchEnd = (e) => {
    const state = gs.current;
    const remaining = e.nativeEvent.touches.length;

    if (remaining < 2 && state.pinchActive) {
      // Fin du pinch : stopper le pinch, marquer la transition, mettre à jour le point de référence
      state.pinchActive    = false;
      state.pinchStartDist = 0;
      state.justEndedPinch = true;
      if (remaining === 1) {
        // Un doigt reste : capturer sa position pour éviter le saut de pan
        state.lastTouchX = e.nativeEvent.touches[0].pageX;
        state.lastTouchY = e.nativeEvent.touches[0].pageY;
      }
      if (state.scale < 1.08) {
        applyZoomAndroid(1, true);
      } else {
        setDisplayScale(state.scale);
      }
      return;
    }

    if (remaining === 0) {
      state.pinchActive    = false;
      state.justEndedPinch = false;

      // Double-tap
      const now = Date.now();
      if (now - state.lastTapTs < 280) {
        state.lastTapTs = 0;
        applyZoomAndroid(state.scale > 1.3 ? 1 : 2.5, true);
        return;
      }
      state.lastTapTs = now;

      if (state.scale < 1.08) applyZoomAndroid(1, true);
      else setDisplayScale(state.scale);
    }
  };

  return (
    <View style={viewerStyles.overlay}>
      <SafeAreaView style={viewerStyles.safeArea}>
        <View style={viewerStyles.header}>
          <View style={{ flex: 1 }}>
            <Text style={viewerStyles.title} numberOfLines={1}>{title}</Text>
            <Text style={viewerStyles.subtitle}>Pincez pour zoomer • Glissez pour déplacer</Text>
          </View>
          <TouchableOpacity style={viewerStyles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={viewerStyles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {isIOS ? (
          /* ── iOS : ScrollView natif UIKit ── */
          <ScrollView
            ref={scrollRef}
            style={viewerStyles.scroll}
            contentContainerStyle={viewerStyles.scrollContent}
            minimumZoomScale={1}
            maximumZoomScale={5}
            bouncesZoom
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            centerContent
            scrollEventThrottle={16}
            onScroll={(e) => {
              const z = e.nativeEvent.zoomScale;
              if (typeof z === 'number') setDisplayScale(z);
            }}
          >
            <Image source={source} style={viewerStyles.image} resizeMode="contain" />
          </ScrollView>
        ) : (
          /* ── Android : événements touch natifs directs ── */
          <View
            style={viewerStyles.imageWrapper}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                viewerStyles.animatedContainer,
                { transform: [{ translateX: transX }, { translateY: transY }, { scale: scaleAnim }] },
              ]}
            >
              <Image pointerEvents="none" source={source} style={viewerStyles.image} resizeMode="contain" />
            </Animated.View>
          </View>
        )}

        {/* Barre de Contrôles Zoom Inférieure */}
        <View style={viewerStyles.controlsBar}>
          <TouchableOpacity
            style={[viewerStyles.zoomBtn, displayScale <= 1.05 && viewerStyles.zoomBtnDisabled]}
            onPress={() => applyZoom(displayScale - 0.5)}
            disabled={displayScale <= 1.05}
            activeOpacity={0.7}
          >
            <Text style={viewerStyles.zoomBtnText}>−</Text>
          </TouchableOpacity>

          <View style={viewerStyles.badge}>
            <Text style={viewerStyles.badgeText}>{Math.round(displayScale * 100)}%</Text>
          </View>

          <TouchableOpacity
            style={[viewerStyles.zoomBtn, displayScale >= 4.95 && viewerStyles.zoomBtnDisabled]}
            onPress={() => applyZoom(displayScale + 0.5)}
            disabled={displayScale >= 4.95}
            activeOpacity={0.7}
          >
            <Text style={viewerStyles.zoomBtnText}>+</Text>
          </TouchableOpacity>

          {displayScale > 1.05 && (
            <TouchableOpacity
              style={viewerStyles.resetBtn}
              onPress={() => applyZoom(1)}
              activeOpacity={0.7}
            >
              <Text style={viewerStyles.resetBtnText}>↺ 100%</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
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

const viewerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 16, 0.96)',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  subtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  closeText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
    width: SW,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: SH * 0.72,
  },
  imageWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  animatedContainer: {
    width: SW,
    height: SH * 0.72,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SW - 16,
    height: SH * 0.7,
  },
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
    backgroundColor: 'rgba(10,20,30,0.85)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  zoomBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 229, 255, 0.2)',
    borderWidth: 1,
    borderColor: '#00E5FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomBtnDisabled: {
    opacity: 0.35,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  zoomBtnText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#00E5FF',
    lineHeight: 24,
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    minWidth: 64,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  resetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 229, 160, 0.2)',
    borderWidth: 1,
    borderColor: '#00E5A0',
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00E5A0',
  },
});

export default DiveSiteTopoModal;
