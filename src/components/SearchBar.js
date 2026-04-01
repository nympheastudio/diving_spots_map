/**
 * SearchBar 2026 – Glass pill avec dropdown premium
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import DivingDataService from '../services/DivingDataService';
import { useTheme } from '../context/ThemeContext';
import { radius, shadows } from '../theme';

const SearchBar = ({ onSpotSelect }) => {
  const { colors, difficultyMeta } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen,    setIsOpen]    = useState(false);
  const debounceRef = useRef(null);
  const dropAnim    = useRef(new Animated.Value(0)).current;

  const handleSearch = useCallback((text) => {
    setQuery(text);
    clearTimeout(debounceRef.current);
    if (!text.trim()) { setResults([]); setIsOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await DivingDataService.searchDivingSpots(text);
        setResults(res);
        setIsOpen(true);
      } catch { setResults([]); }
      finally { setIsLoading(false); }
    }, 280);
  }, []);

  useEffect(() => {
    Animated.spring(dropAnim, {
      toValue: isOpen ? 1 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [isOpen]);

  const handleSelect = useCallback((spot) => {
    onSpotSelect?.(spot);
    setQuery(''); setResults([]); setIsOpen(false);
  }, [onSpotSelect]);

  const handleClear = useCallback(() => {
    setQuery(''); setResults([]); setIsOpen(false);
  }, []);

  const dropStyle = {
    opacity: dropAnim,
    transform: [{ translateY: dropAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
  };

  const renderItem = useCallback(({ item }) => {
    const diff = difficultyMeta[item.difficulte] || difficultyMeta.Intermediate;
    return (
      <TouchableOpacity style={styles.resultItem} onPress={() => handleSelect(item)} activeOpacity={0.75}>
        <Image source={{ uri: item.photo }} style={styles.thumb} resizeMode="cover" />
        <View style={styles.resultBody}>
          <Text style={styles.resultName} numberOfLines={1}>{item.nom}</Text>
          <Text style={styles.resultSub}>{item.localite}</Text>
        </View>
        <View style={[styles.diffPill, { backgroundColor: diff.bg }]}>
          <Text style={[styles.diffPillText, { color: diff.color }]}>{diff.label}</Text>
        </View>
      </TouchableOpacity>
    );
  }, [handleSelect, styles, difficultyMeta]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.pill}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          style={styles.input}
          placeholder="Spot, ville, type…"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={handleSearch}
          returnKeyType="search"
          selectionColor={colors.primary}
        />
        {isLoading
          ? <ActivityIndicator size="small" color={colors.primary} style={styles.right} />
          : query.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={styles.right} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <View style={styles.clearBtn}><Text style={styles.clearIcon}>✕</Text></View>
            </TouchableOpacity>
          )
        }
      </View>

      {isOpen && (
        <Animated.View style={[styles.dropdown, dropStyle]}>
          {results.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>Aucun spot trouvé</Text>
            </View>
          ) : (
            <FlatList
              data={results}
              renderItem={renderItem}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={results.length > 4}
              style={{ maxHeight: 340 }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </Animated.View>
      )}
    </View>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    zIndex: 200,
  },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgGlass,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderMid,
    paddingHorizontal: 14,
    height: 48,
    gap: 8,
    ...shadows.card,
  },
  searchIcon: {
    fontSize: 20,
    color: colors.primary,
    marginTop: -2,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  right: { marginLeft: 4 },
  clearBtn: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.bgGlassLight,
    alignItems: 'center', justifyContent: 'center',
  },
  clearIcon: { fontSize: 11, color: colors.textSecondary, fontWeight: '700' },

  dropdown: {
    marginTop: 8,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.card,
  },

  resultItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 14, gap: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  thumb: {
    width: 44, height: 44, borderRadius: radius.sm,
    backgroundColor: colors.bgCard,
  },
  resultBody: { flex: 1 },
  resultName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 3 },
  resultSub:  { fontSize: 12, color: colors.textSecondary },
  diffPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill },
  diffPillText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },

  emptyRow: { paddingVertical: 28, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 14 },
});

SearchBar.propTypes = {
  onSpotSelect: PropTypes.func,
  onClose: PropTypes.func,
};

export default SearchBar;
