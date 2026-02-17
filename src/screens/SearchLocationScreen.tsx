import React, {useState, useCallback, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  Keyboard,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {useWeatherStore} from '../store/weatherStore';
import {searchLocations} from '../services/openMeteoService';
import {colors} from '../theme/colors';
import {Location} from '../types/weather';
import {useResponsiveLayout} from '../utils/platformDetect';

interface SearchResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  country_code?: string;
  admin1?: string;
  timezone: string;
}

export function SearchLocationScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const isDarkMode = useColorScheme() === 'dark';
  
  const {settings, addLocation, locations} = useWeatherStore();
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const theme = settings.theme;
  const useDark = theme === 'dark' || (theme === 'system' && isDarkMode);
  const themeColors = useDark ? colors.dark : colors.light;
  const layout = useResponsiveLayout();

  // Debounced search function
  const performSearch = useCallback(async (searchText: string) => {
    if (searchText.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const searchResults = await searchLocations(searchText);
      setResults(searchResults);
    } catch (err) {
      setError('Failed to search locations');
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (text.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    // Show loading immediately
    setIsLoading(true);

    // Debounce the actual search by 300ms
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(text);
    }, 300);
  }, [performSearch]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleSelectLocation = useCallback((result: SearchResult) => {
    Keyboard.dismiss();
    
    // Check if location already exists
    const exists = locations.some(
      l => Math.abs(l.latitude - result.latitude) < 0.01 &&
           Math.abs(l.longitude - result.longitude) < 0.01
    );

    if (exists) {
      setError('This location already exists');
      return;
    }

    const newLocation: Location = {
      id: `${result.latitude}-${result.longitude}-${Date.now()}`,
      latitude: result.latitude,
      longitude: result.longitude,
      timezone: result.timezone,
      city: result.name,
      province: result.admin1,
      country: result.country,
      countryCode: result.country_code,
      isCurrentPosition: false,
      forecastSource: 'openmeteo',
    };

    addLocation(newLocation);
    navigation.goBack();
  }, [addLocation, locations, navigation]);

  const renderResult = useCallback(({item}: {item: SearchResult}) => (
    <View style={[
      styles.resultWrapper,
      {
        paddingHorizontal: layout.contentPadding,
        maxWidth: layout.maxContentWidth,
        alignSelf: layout.maxContentWidth ? 'center' : undefined,
        width: layout.maxContentWidth ? '100%' : undefined,
      },
    ]}>
      <TouchableOpacity
      style={[styles.resultItem, {borderBottomColor: themeColors.border}]}
      onPress={() => handleSelectLocation(item)}>
      <Icon name="map-marker" size={24} color={themeColors.textSecondary} />
      <View style={styles.resultContent}>
        <Text style={[styles.resultName, {color: themeColors.text}]}>
          {item.name}
        </Text>
        <Text style={[styles.resultDetails, {color: themeColors.textSecondary}]}>
          {[item.admin1, item.country].filter(Boolean).join(', ')}
        </Text>
      </View>
      <Icon name="chevron-right" size={24} color={themeColors.textSecondary} />
    </TouchableOpacity>
    </View>
  ), [themeColors, handleSelectLocation, layout]);

  return (
    <View style={[styles.container, {backgroundColor: themeColors.background}]}>
      <View style={[
        styles.innerContainer,
        {
          maxWidth: layout.maxContentWidth,
          alignSelf: layout.maxContentWidth ? 'center' : undefined,
          width: layout.maxContentWidth ? '100%' : undefined,
          paddingHorizontal: layout.contentPadding,
        },
      ]}>
      {/* Search Input */}
      <View style={[styles.searchContainer, {backgroundColor: themeColors.surface}]}>
        <Icon name="magnify" size={24} color={themeColors.textSecondary} />
        <TextInput
          style={[styles.searchInput, {color: themeColors.text}]}
          placeholder="Search for a city..."
          placeholderTextColor={themeColors.textTertiary}
          value={query}
          onChangeText={handleSearch}
          autoFocus
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="words"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Icon name="close-circle" size={20} color={themeColors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Error Message */}
      {error && (
        <View style={[
          styles.messageWrapper,
          {
            paddingHorizontal: layout.contentPadding,
            maxWidth: layout.maxContentWidth,
            alignSelf: layout.maxContentWidth ? 'center' : undefined,
            width: layout.maxContentWidth ? '100%' : undefined,
          },
        ]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, {color: themeColors.error}]}>{error}</Text>
        </View>
        </View>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <View style={[
          styles.messageWrapper,
          {
            paddingHorizontal: layout.contentPadding,
            maxWidth: layout.maxContentWidth,
            alignSelf: layout.maxContentWidth ? 'center' : undefined,
            width: layout.maxContentWidth ? '100%' : undefined,
          },
        ]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
        </View>
      )}

      {/* Results List */}
      <FlatList
        data={results}
        keyExtractor={(item) => `${item.id}`}
        renderItem={renderResult}
        contentContainerStyle={styles.resultsList}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          !isLoading && query.length >= 2 ? (
            <View style={[
              styles.messageWrapper,
              {
                paddingHorizontal: layout.contentPadding,
                maxWidth: layout.maxContentWidth,
                alignSelf: layout.maxContentWidth ? 'center' : undefined,
                width: layout.maxContentWidth ? '100%' : undefined,
              },
            ]}>
            <View style={styles.emptyContainer}>
              <Icon name="map-search" size={48} color={themeColors.textSecondary} />
              <Text style={[styles.emptyText, {color: themeColors.textSecondary}]}>
                No locations found
              </Text>
            </View>
            </View>
          ) : null
        }
      />

      {/* Current Location Button */}
      <View style={[
        styles.buttonWrapper,
        {
          paddingHorizontal: layout.contentPadding,
          maxWidth: layout.maxContentWidth,
          alignSelf: layout.maxContentWidth ? 'center' : undefined,
          width: layout.maxContentWidth ? '100%' : undefined,
        },
      ]}>
      <TouchableOpacity
        style={[styles.currentLocationButton, {backgroundColor: themeColors.primary}]}
        onPress={() => {
          // TODO: Implement current location
          setError('Current location not implemented yet');
        }}>
        <Icon name="crosshairs-gps" size={24} color="#FFFFFF" />
        <Text style={styles.currentLocationText}>Use current location</Text>
      </TouchableOpacity>
      </View>

      <View style={{height: insets.bottom}} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    height: 48,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  errorContainer: {
    paddingBottom: 8,
  },
  errorText: {
    fontSize: 14,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  resultsList: {
    paddingBottom: 16,
  },
  resultWrapper: {
    // Centering wrapper for each result
  },
  messageWrapper: {
    // Centering wrapper for messages
  },
  buttonWrapper: {
    // Centering wrapper for button
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  resultContent: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '500',
  },
  resultDetails: {
    fontSize: 13,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 48,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  currentLocationText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
