/**
 * Composant SearchBar avec moteur de recherche
 */

import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import DivingDataService from '../services/DivingDataService';

const SearchBar = ({ onSpotSelect, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Effectuer une recherche
  const handleSearch = useCallback(async (text) => {
    setQuery(text);

    if (text.trim().length === 0) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const searchResults = await DivingDataService.searchDivingSpots(text);
      setResults(searchResults);
      setIsVisible(true);
    } catch (error) {
      console.log('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSpotPress = useCallback((spot) => {
    onSpotSelect?.(spot);
    setQuery('');
    setResults([]);
    setIsVisible(false);
  }, [onSpotSelect]);

  const renderResultItem = ({ item }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleSpotPress(item)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: item.photo }}
        style={styles.resultThumb}
        resizeMode="cover"
      />
      <View style={styles.resultTextBlock}>
        <Text style={styles.resultName} numberOfLines={1}>{item.nom}</Text>
        <Text style={styles.resultSubtitle}>{item.localite} • {item.difficulte}</Text>
      </View>
      <Text style={styles.resultType}>{item.type_site}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchInputContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un spot..."
          placeholderTextColor="#999"
          value={query}
          onChangeText={handleSearch}
          onFocus={() => setIsVisible(query.length > 0)}
        />

        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setQuery('');
              setResults([]);
              setIsVisible(false);
            }}
            style={styles.clearButton}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {isVisible && (
        <View style={styles.resultsContainer}>
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4A90E2" />
            </View>
          )}

          {!isLoading && results.length === 0 && query.length > 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucun spot trouvé</Text>
            </View>
          )}

          {results.length > 0 && (
            <FlatList
              data={results}
              renderItem={renderResultItem}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              style={styles.resultsList}
            />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 0,
    zIndex: 100,
    position: 'relative',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#13131D',
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    fontSize: 20,
    color: '#999',
  },
  resultsContainer: {
    position: 'absolute',
    top: 68,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    maxHeight: 380,
    zIndex: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 10,
    overflow: 'hidden',
  },
  loadingContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsList: {
    maxHeight: 380,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 10,
  },
  resultThumb: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: '#E8F4F8',
    flexShrink: 0,
  },
  resultTextBlock: {
    flex: 1,
  },
  resultName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#13131D',
    marginBottom: 4,
  },
  resultSubtitle: {
    fontSize: 12,
    color: '#6C7383',
  },
  resultType: {
    fontSize: 11,
    color: '#4A90E2',
    fontWeight: '600',
    backgroundColor: '#EBF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  emptyContainer: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
});

SearchBar.propTypes = {
  onSpotSelect: PropTypes.func,
  onClose: PropTypes.func,
};

SearchBar.defaultProps = {
  onSpotSelect: () => {},
  onClose: () => {},
};

export default SearchBar;
