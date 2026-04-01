/**
 * Design System 2026 – Ocean Deep ULTRA
 * Dual theme: Dark (bioluminescence) + Light (daylight ocean)
 */

// ── Dark palette ──────────────────────────────────────────────────────────
export const darkColors = {
  bg:              '#050A10',
  bgCard:          '#0A1520',
  bgElevated:      '#0F1C2E',
  bgGlass:         'rgba(8,15,28,0.82)',
  bgGlassLight:    'rgba(255,255,255,0.07)',
  bgGlassStrong:   'rgba(255,255,255,0.13)',

  primary:         '#00E5FF',
  primaryDim:      'rgba(0,229,255,0.13)',
  primaryMid:      'rgba(0,229,255,0.30)',
  primaryGlow:     'rgba(0,229,255,0.55)',

  secondary:       '#7B61FF',
  secondaryDim:    'rgba(123,97,255,0.15)',
  secondaryMid:    'rgba(123,97,255,0.30)',
  secondaryGlow:   'rgba(123,97,255,0.55)',

  accent:          '#FF4757',
  accentDim:       'rgba(255,71,87,0.14)',
  accentGlow:      'rgba(255,71,87,0.50)',

  emerald:         '#00E5A0',
  emeraldDim:      'rgba(0,229,160,0.15)',

  amber:           '#FFB020',
  amberDim:        'rgba(255,176,32,0.15)',

  textPrimary:     '#EEF2FF',
  textSecondary:   'rgba(238,242,255,0.60)',
  textMuted:       'rgba(238,242,255,0.32)',
  textDisabled:    'rgba(238,242,255,0.16)',

  border:          'rgba(255,255,255,0.07)',
  borderMid:       'rgba(255,255,255,0.13)',
  borderBright:    'rgba(255,255,255,0.24)',

  gradOcean:     ['#050A10', '#0A1830', '#0D2244'],
  gradCard:      ['rgba(0,229,255,0.07)', 'rgba(0,229,255,0.0)'],
  gradHero:      ['transparent', 'rgba(5,10,16,0.75)', 'rgba(5,10,16,0.99)'],
  gradPrimary:   ['#00E5FF', '#0088FF'],
  gradSecondary: ['#7B61FF', '#C061FF'],
  gradAccent:    ['#FF4757', '#FF8B6A'],
  gradProfile:   ['#00E5FF', '#7B61FF'],
  gradNav:       ['rgba(5,10,16,0)', 'rgba(5,10,16,0.88)', 'rgba(5,10,16,0.99)'],
};

// ── Light palette ─────────────────────────────────────────────────────────
export const lightColors = {
  bg:              '#EFF5FF',
  bgCard:          '#FFFFFF',
  bgElevated:      '#F5F9FF',
  bgGlass:         'rgba(255,255,255,0.90)',
  bgGlassLight:    'rgba(0,30,80,0.05)',
  bgGlassStrong:   'rgba(0,30,80,0.10)',

  primary:         '#0077BB',
  primaryDim:      'rgba(0,119,187,0.10)',
  primaryMid:      'rgba(0,119,187,0.25)',
  primaryGlow:     'rgba(0,119,187,0.42)',

  secondary:       '#5B3FEE',
  secondaryDim:    'rgba(91,63,238,0.10)',
  secondaryMid:    'rgba(91,63,238,0.25)',
  secondaryGlow:   'rgba(91,63,238,0.42)',

  accent:          '#E83248',
  accentDim:       'rgba(232,50,72,0.10)',
  accentGlow:      'rgba(232,50,72,0.42)',

  emerald:         '#008855',
  emeraldDim:      'rgba(0,136,85,0.12)',

  amber:           '#CC7A00',
  amberDim:        'rgba(204,122,0,0.12)',

  textPrimary:     '#0D1B2A',
  textSecondary:   'rgba(13,27,42,0.62)',
  textMuted:       'rgba(13,27,42,0.38)',
  textDisabled:    'rgba(13,27,42,0.20)',

  border:          'rgba(0,20,50,0.09)',
  borderMid:       'rgba(0,20,50,0.16)',
  borderBright:    'rgba(0,20,50,0.28)',

  gradOcean:     ['#EFF5FF', '#DDE8FF', '#C8DAFF'],
  gradCard:      ['rgba(0,119,187,0.06)', 'rgba(0,119,187,0.0)'],
  gradHero:      ['transparent', 'rgba(239,245,255,0.80)', 'rgba(239,245,255,0.99)'],
  gradPrimary:   ['#0099CC', '#0055AA'],
  gradSecondary: ['#5B3FEE', '#8B3FEE'],
  gradAccent:    ['#E83248', '#FF6655'],
  gradProfile:   ['#0099CC', '#5B3FEE'],
  gradNav:       ['rgba(239,245,255,0)', 'rgba(239,245,255,0.88)', 'rgba(239,245,255,0.99)'],
};

// Backward compat – always dark for files not yet migrated
export const colors = darkColors;

// ── Difficulty meta ───────────────────────────────────────────────────────
export const DIFFICULTY_META = {
  Beginner:     { color: '#00E5A0', bg: 'rgba(0,229,160,0.15)',  label: 'Débutant'      },
  Intermediate: { color: '#FFB020', bg: 'rgba(255,176,32,0.15)', label: 'Intermédiaire' },
  Advanced:     { color: '#FF4757', bg: 'rgba(255,71,87,0.15)',  label: 'Expert'        },
};

export const DIFFICULTY_META_LIGHT = {
  Beginner:     { color: '#008855', bg: 'rgba(0,136,85,0.12)',   label: 'Débutant'      },
  Intermediate: { color: '#CC7A00', bg: 'rgba(204,122,0,0.12)',  label: 'Intermédiaire' },
  Advanced:     { color: '#CC2233', bg: 'rgba(204,34,51,0.12)',  label: 'Expert'        },
};

// ── Shared tokens ─────────────────────────────────────────────────────────
export const radius = {
  xs:   8,
  sm:   12,
  md:   16,
  lg:   20,
  xl:   28,
  xxl:  36,
  pill: 999,
};

export const spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  xxl: 32,
};

export const shadows = {
  glow: {
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.50,
    shadowRadius: 18,
    elevation: 14,
  },
  glowPurple: {
    shadowColor: '#7B61FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.50,
    shadowRadius: 18,
    elevation: 14,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55,
    shadowRadius: 22,
    elevation: 18,
  },
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 7,
  },
  navGlow: {
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 20,
  },
};
