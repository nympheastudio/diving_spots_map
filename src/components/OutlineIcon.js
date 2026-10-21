import React from 'react';
import { Ionicons } from '@expo/vector-icons';

// One icon family for controls, menus and map labels. Data may still carry
// legacy symbols; resolve them here so their presentation stays consistent.
const LEGACY_ICONS = {
  '◉': 'person-circle-outline',
  '★': 'star-outline',
  '☆': 'star-outline',
  '◈': 'notifications-outline',
  '◧': 'settings-outline',
  'ℹ': 'information-circle-outline',
  '✎': 'create-outline',
  '✓': 'checkmark-outline',
  '✕': 'close-outline',
  '×': 'close-outline',
  '›': 'chevron-forward-outline',
  '‹': 'chevron-back-outline',
  '↩': 'log-out-outline',
  '↺': 'refresh-outline',
  '↕': 'resize-outline',
  '⬇': 'arrow-down-outline',
  '◎': 'locate-outline',
  '⧉': 'options-outline',
  '▤': 'document-text-outline',
  '📍': 'location-outline',
  '🤿': 'water-outline',
  '🌊': 'water-outline',
  '👁': 'eye-outline',
  '⚓': 'boat-outline',
  '🗺️': 'map-outline',
  '🖼️': 'image-outline',
  '📐': 'resize-outline',
  '🔍': 'expand-outline',
  '➔': 'arrow-forward-outline',
  '🐠': 'fish-outline',
  '🐟': 'fish-outline',
  '🌿': 'leaf-outline',
  '📸': 'camera-outline',
  '📷': 'camera-outline',
  '🧭': 'compass-outline',
  '☀️': 'sunny-outline',
  '🌙': 'moon-outline',
  '⭐': 'star-outline',
  '📅': 'calendar-outline',
  '🗑': 'trash-outline',
  '🌐': 'globe-outline',
  '🔒': 'lock-closed-outline',
  '📜': 'document-text-outline',
  '📧': 'mail-outline',
  '🔗': 'link-outline',
  '🚢': 'boat-outline',
  '🕳️': 'ellipse-outline',
  '🚪': 'enter-outline',
  '🪨': 'shapes-outline',
  '🧱': 'layers-outline',
  '⛵': 'boat-outline',
  '✈️': 'airplane-outline',
  '🚁': 'airplane-outline',
  '🏺': 'flask-outline',
  '🏛️': 'business-outline',
  '🗿': 'shapes-outline',
  '⛩️': 'shapes-outline',
  '🏖️': 'sunny-outline',
  '🦈': 'fish-outline',
  '🐬': 'fish-outline',
  '🪸': 'flower-outline',
  '↕️': 'resize-outline',
};

export const iconNameFor = (name) => LEGACY_ICONS[name] || (typeof name === 'string' && name.endsWith('-outline') ? name : 'location-outline');

const OutlineIcon = ({ name, size = 20, color, style }) => (
  <Ionicons name={iconNameFor(name)} size={size} color={color} style={style} />
);

export default OutlineIcon;
