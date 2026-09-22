/**
 * ZoomableTopoViewer – Visualisateur interactif plein écran de carte bathymétrique
 * iOS : ScrollView natif UIKit (minimumZoomScale/maximumZoomScale).
 * Android : Événements touch natifs (onTouchStart/onTouchMove/onTouchEnd).
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
  Platform,
  Dimensions,
  SafeAreaView,
  Animated,
} from 'react-native';

const { width: SW, height: SH } = Dimensions.get('window');

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

ZoomableTopoViewer.propTypes = {
  source: PropTypes.oneOfType([PropTypes.number, PropTypes.object]).isRequired,
  title: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};

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

export default ZoomableTopoViewer;
