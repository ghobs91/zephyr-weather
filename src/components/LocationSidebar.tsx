import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {useWeatherStore} from '../store/weatherStore';
import {Location} from '../types/weather';
import {isMacOS} from '../utils/platformDetect';
import {formatTime} from '../utils/timeFormat';

interface LocationSidebarProps {
  isDark: boolean;
  themeColors: any;
  onLocationSelect: (index: number) => void;
  onSearchPress: () => void;
  onSettingsPress: () => void;
}

export function LocationSidebar({
  isDark,
  themeColors,
  onLocationSelect,
  onSearchPress,
  onSettingsPress,
}: LocationSidebarProps) {
  const {
    locations,
    currentLocationIndex,
    settings,
    removeLocation,
  } = useWeatherStore();

  const formatTemp = (temp?: number): string => {
    if (temp === undefined) return '--°';
    if (settings.temperatureUnit === 'fahrenheit') {
      return `${Math.round(temp * 9/5 + 32)}°`;
    }
    return `${Math.round(temp)}°`;
  };

  const handleDeleteLocation = (item: Location, index: number) => {
    const locationName = item.city || 'this location';
    Alert.alert(
      'Delete Location',
      `Are you sure you want to delete ${locationName}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            removeLocation(item.id);
          },
        },
      ],
      {cancelable: true}
    );
  };

  const renderLocation = ({item, index}: {item: Location; index: number}) => {
    const isSelected = index === currentLocationIndex;
    const weather = item.weather;
    const current = weather?.current;
    const today = weather?.dailyForecast?.[0];

    return (
      <TouchableOpacity
        style={[
          styles.locationItem,
          {
            backgroundColor: isSelected 
              ? (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)')
              : 'transparent',
          },
        ]}
        onPress={() => onLocationSelect(index)}
        onLongPress={() => handleDeleteLocation(item, index)}>
        <View style={styles.locationHeader}>
          <View style={styles.locationTitleRow}>
            <Text style={[styles.locationName, {color: themeColors.text}]} numberOfLines={1}>
              {item.city || 'Unknown'}
            </Text>
          </View>
          <Text style={[styles.locationTime, {color: themeColors.textSecondary}]}>
            {formatTime(new Date(), settings.timeFormat)}
          </Text>
        </View>

        <View style={styles.weatherRow}>
          <Text style={[styles.temperature, {color: themeColors.text}]}>
            {formatTemp(current?.temperature?.temperature)}
          </Text>
          {item.isCurrentPosition && (
            <View style={styles.currentLocationBadge}>
              <Icon name="map-marker" size={12} color={themeColors.textSecondary} />
            </View>
          )}
        </View>

        {current && (
          <Text style={[styles.condition, {color: themeColors.textSecondary}]} numberOfLines={1}>
            {current.weatherText}
          </Text>
        )}

        {today && (
          <View style={styles.tempRange}>
            <Text style={[styles.tempRangeText, {color: themeColors.textSecondary}]}>
              H:{formatTemp(today.day?.temperature?.temperature)}
            </Text>
            <Text style={[styles.tempRangeText, {color: themeColors.textSecondary}]}>
              {' '}L:{formatTemp(today.night?.temperature?.temperature)}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, {backgroundColor: isDark ? '#1c1c1e' : '#f2f2f7'}]}>
      {isMacOS() ? (
        // macOS: Floating container style
        <>
          <View style={styles.macOSFloatingContainer}>
            <View style={[
              styles.macOSCard,
              {backgroundColor: isDark ? 'rgba(58, 58, 60, 0.95)' : 'rgba(255, 255, 255, 0.95)'},
            ]}>
              {/* Search Bar */}
              <View style={styles.macOSSearchContainer}>
                <TouchableOpacity 
                  style={[styles.searchBar, {backgroundColor: isDark ? 'rgba(118, 118, 128, 0.24)' : 'rgba(0, 0, 0, 0.06)'}]}
                  onPress={onSearchPress}>
                  <Icon name="magnify" size={16} color={themeColors.textSecondary} />
                  <Text style={[styles.searchPlaceholder, {color: themeColors.textSecondary}]}>
                    Search
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Locations List */}
              <FlatList
                data={locations}
                keyExtractor={(item) => item.id}
                renderItem={renderLocation}
                contentContainerStyle={styles.macOSListContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Icon name="map-marker-off" size={40} color={themeColors.textSecondary} />
                    <Text style={[styles.emptyText, {color: themeColors.textSecondary}]}>
                      No locations
                    </Text>
                  </View>
                }
              />
            </View>
          </View>

          {/* Settings Button - Outside the card */}
          <View style={[styles.footer, {borderTopColor: 'transparent'}]}>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={onSettingsPress}>
              <Icon name="cog-outline" size={20} color={themeColors.textSecondary} />
              <Text style={[styles.settingsText, {color: themeColors.textSecondary}]}>
                Settings
              </Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        // iOS/Mobile: Original layout
        <>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <TouchableOpacity 
              style={[styles.searchBar, {backgroundColor: isDark ? '#2c2c2e' : '#e5e5ea'}]}
              onPress={onSearchPress}>
              <Icon name="magnify" size={18} color={themeColors.textSecondary} />
              <Text style={[styles.searchPlaceholder, {color: themeColors.textSecondary}]}>
                Search
              </Text>
            </TouchableOpacity>
          </View>

          {/* Locations List */}
          <FlatList
            data={locations}
            keyExtractor={(item) => item.id}
            renderItem={renderLocation}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="map-marker-off" size={40} color={themeColors.textSecondary} />
                <Text style={[styles.emptyText, {color: themeColors.textSecondary}]}>
                  No locations
                </Text>
              </View>
            }
          />

          {/* Settings Button */}
          <View style={[styles.footer, {borderTopColor: isDark ? '#2c2c2e' : '#e5e5ea'}]}>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={onSettingsPress}>
              <Icon name="cog-outline" size={22} color={themeColors.textSecondary} />
              <Text style={[styles.settingsText, {color: themeColors.textSecondary}]}>
                Settings
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 280,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(0,0,0,0.1)',
  },
  macOSFloatingContainer: {
    flex: 1,
    paddingTop: 48,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  macOSCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  macOSSearchContainer: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  macOSListContent: {
    paddingBottom: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  searchPlaceholder: {
    fontSize: 15,
    fontWeight: '400',
  },
  listContent: {
    paddingBottom: 16,
  },
  locationItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    marginHorizontal: 8,
    marginVertical: 2,
  },
  locationHeader: {
    marginBottom: 8,
  },
  locationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  locationName: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
  },
  currentLocationBadge: {
    marginLeft: 4,
  },
  locationTime: {
    fontSize: 13,
    fontWeight: '400',
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  temperature: {
    fontSize: 48,
    fontWeight: '200',
    letterSpacing: -2,
  },
  condition: {
    fontSize: 15,
    marginBottom: 4,
  },
  tempRange: {
    flexDirection: 'row',
    gap: 8,
  },
  tempRangeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 15,
    marginTop: 12,
    textAlign: 'center',
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  settingsText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
