/**
 * FilterSheet 2026 – Bottom sheet glass dark + chips pills
 */

import React, { useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { radius, shadows, spacing } from '../theme';

const DIFFICULTY_OPTIONS = ['Beginner', 'Intermediate', 'Advanced'];
const SITE_TYPE_OPTIONS = [
  'Îlot / Archipel', 'Grotte', 'Parc naturel / Îlot', 'Épave',
  'Tombant', 'Tombant rocheux', 'Plate-forme rocheuse',
  'Montagne sous-marine', 'Récif artificiel',
];

const DEPTH_STEPS  = [20, 30, 40, 50, 60, 70];
const VIS_STEPS    = [0, 10, 20, 30, 40];

const FilterSheet = ({ isVisible, onClose, onApplyFilters }) => {
  const { colors, difficultyMeta } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [selectedDifficulty, setSelectedDifficulty] = useState([]);
  const [selectedTypes,      setSelectedTypes]      = useState([]);
  const [maxDepth,            setMaxDepth]           = useState(70);
  const [minVisibility,       setMinVisibility]      = useState(0);

  const toggleDifficulty = useCallback((d) =>
    setSelectedDifficulty(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]), []);

  const toggleType = useCallback((t) =>
    setSelectedTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]), []);

  const handleApply = () => {
    onApplyFilters({ difficulty: selectedDifficulty, type: selectedTypes, maxDepth, minVisibility });
    onClose();
  };

  const handleReset = () => {
    setSelectedDifficulty([]); setSelectedTypes([]); setMaxDepth(70); setMinVisibility(0);
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <TouchableOpacity onPress={handleReset} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.resetLabel}>Réinit.</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Filtres</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <View style={styles.closeBtn}><Text style={styles.closeBtnText}>✕</Text></View>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>

            {/* Difficulté */}
            <Text style={styles.sectionLabel}>Niveau</Text>
            <View style={styles.chipsRow}>
              {DIFFICULTY_OPTIONS.map((d) => {
                const meta = difficultyMeta[d];
                const active = selectedDifficulty.includes(d);
                return (
                  <TouchableOpacity
                    key={d}
                    style={[styles.chip, active && { backgroundColor: meta.bg, borderColor: meta.color }]}
                    onPress={() => toggleDifficulty(d)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.chipDot, { backgroundColor: active ? meta.color : colors.textMuted }]} />
                    <Text style={[styles.chipLabel, active && { color: meta.color, fontWeight: '700' }]}>{meta.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Type de site */}
            <Text style={styles.sectionLabel}>Type de site</Text>
            <View style={styles.chipsRow}>
              {SITE_TYPE_OPTIONS.map((t) => {
                const active = selectedTypes.includes(t);
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => toggleType(t)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{t}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Profondeur max */}
            <Text style={styles.sectionLabel}>Profondeur max</Text>
            <View style={styles.stepperRow}>
              {DEPTH_STEPS.map((v) => (
                <TouchableOpacity
                  key={v}
                  style={[styles.stepBtn, maxDepth === v && styles.stepBtnActive]}
                  onPress={() => setMaxDepth(v)}
                >
                  <Text style={[styles.stepLabel, maxDepth === v && styles.stepLabelActive]}>{v}m</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Visibilité min */}
            <Text style={styles.sectionLabel}>Visibilité min</Text>
            <View style={styles.stepperRow}>
              {VIS_STEPS.map((v) => (
                <TouchableOpacity
                  key={v}
                  style={[styles.stepBtn, minVisibility === v && styles.stepBtnActive]}
                  onPress={() => setMinVisibility(v)}
                >
                  <Text style={[styles.stepLabel, minVisibility === v && styles.stepLabelActive]}>
                    {v === 0 ? 'Tout' : `${v}m`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApply} activeOpacity={0.85}>
              <Text style={styles.applyBtnText}>Appliquer les filtres</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    ...shadows.card,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.borderMid,
    alignSelf: 'center', marginTop: 10, marginBottom: 2,
  },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, letterSpacing: 0.2 },
  resetLabel: { fontSize: 14, color: colors.primary, fontWeight: '600', minWidth: 50 },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.bgGlassLight,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  closeBtnText: { fontSize: 12, color: colors.textSecondary, fontWeight: '700' },

  body: {
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg,
    paddingBottom: spacing.md, gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: colors.textMuted,
    letterSpacing: 1.1, textTransform: 'uppercase',
    marginTop: spacing.md, marginBottom: spacing.xs,
  },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 13, paddingVertical: 8,
    borderRadius: radius.pill, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.bgCard,
  },
  chipActive: { backgroundColor: colors.primaryDim, borderColor: colors.primary },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipLabel: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  chipLabelActive: { color: colors.primary, fontWeight: '700' },

  stepperRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  stepBtn: {
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.bgCard,
  },
  stepBtnActive: { backgroundColor: colors.primaryDim, borderColor: colors.primary },
  stepLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  stepLabelActive: { color: colors.primary },

  footer: {
    paddingHorizontal: spacing.lg, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  applyBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg, paddingVertical: 15, alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.50, shadowRadius: 18, elevation: 14,
  },
  applyBtnText: { fontSize: 16, fontWeight: '700', color: colors.bg, letterSpacing: 0.3 },
});

FilterSheet.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onApplyFilters: PropTypes.func.isRequired,
};

export default FilterSheet;
