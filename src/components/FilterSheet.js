/**
 * Composant FilterSheet - Filtrer les spots par critères
 */

import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
} from 'react-native';

const DIFFICULTY_OPTIONS = ['Beginner', 'Intermediate', 'Advanced'];
const SITE_TYPE_OPTIONS = [
  'Îlot / Archipel',
  'Grotte',
  'Parc naturel / Îlot',
  'Épave',
  'Tombant',
  'Tombant rocheux',
  'Plate-forme rocheuse',
  'Montagne sous-marine',
  'Récif artificiel',
];

const FilterSheet = ({ isVisible, onClose, onApplyFilters }) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [minDepth, setMinDepth] = useState(0);
  const [maxDepth, setMaxDepth] = useState(70);
  const [minVisibility, setMinVisibility] = useState(0);

  const handleDifficultyToggle = useCallback((difficulty) => {
    setSelectedDifficulty(prev =>
      prev.includes(difficulty)
        ? prev.filter(d => d !== difficulty)
        : [...prev, difficulty]
    );
  }, []);

  const handleTypeToggle = useCallback((type) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  }, []);

  const handleApply = () => {
    onApplyFilters({
      difficulty: selectedDifficulty,
      type: selectedTypes,
      minDepth,
      maxDepth,
      minVisibility,
    });
    onClose();
  };

  const handleReset = () => {
    setSelectedDifficulty([]);
    setSelectedTypes([]);
    setMinDepth(0);
    setMaxDepth(70);
    setMinVisibility(0);
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>Annuler</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Filtres</Text>
          <TouchableOpacity onPress={handleReset}>
            <Text style={styles.resetButton}>Réinitialiser</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Difficulté */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Niveau de Difficulté</Text>
            {DIFFICULTY_OPTIONS.map(difficulty => (
              <FilterOption
                key={difficulty}
                label={difficulty}
                selected={selectedDifficulty.includes(difficulty)}
                onToggle={() => handleDifficultyToggle(difficulty)}
              />
            ))}
          </View>

          {/* Type de Site */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Type de Site</Text>
            {SITE_TYPE_OPTIONS.map(type => (
              <FilterOption
                key={type}
                label={type}
                selected={selectedTypes.includes(type)}
                onToggle={() => handleTypeToggle(type)}
              />
            ))}
          </View>

          {/* Profondeur */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profondeur Maximale</Text>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderValue}>{maxDepth}m</Text>
              {/* Nota: À implémenter avec une vraie librairie de slider */}
              <View style={styles.sliderNote}>
                <Text style={styles.sliderNoteText}>Slider à configurer</Text>
              </View>
            </View>
          </View>

          {/* Visibilité */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Visibilité Minimale</Text>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderValue}>{minVisibility}m</Text>
              <View style={styles.sliderNote}>
                <Text style={styles.sliderNoteText}>Slider à configurer</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Footer Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.applyButton}
            onPress={handleApply}
            activeOpacity={0.7}
          >
            <Text style={styles.applyButtonText}>Appliquer les filtres</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const FilterOption = ({ label, selected, onToggle }) => (
  <TouchableOpacity
    style={styles.filterOption}
    onPress={onToggle}
    activeOpacity={0.7}
  >
    <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
      {selected && <Text style={styles.checkmark}>✓</Text>}
    </View>
    <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
    marginTop: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#13131D',
  },
  closeButton: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '600',
  },
  resetButton: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginVertical: 8,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#13131D',
    marginBottom: 12,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E8E8E8',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  optionLabel: {
    fontSize: 14,
    color: '#666',
  },
  optionLabelSelected: {
    fontWeight: '600',
    color: '#13131D',
  },
  sliderContainer: {
    paddingVertical: 8,
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 8,
  },
  sliderNote: {
    backgroundColor: '#F0F0F0',
    padding: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderNoteText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#13131D',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

FilterSheet.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onApplyFilters: PropTypes.func.isRequired,
};

FilterOption.propTypes = {
  label: PropTypes.string.isRequired,
  selected: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default FilterSheet;
