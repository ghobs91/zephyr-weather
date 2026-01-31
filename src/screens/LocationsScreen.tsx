import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  useColorScheme,
  Alert,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {useWeatherStore} from '../store/weatherStore';
import {colors} from '../theme/colors';
import {Location, WeatherCode} from '../types/weather';
import {RootStackParamList, MainTabParamList} from '../navigation/RootNavigator';

type NavigationProp = BottomTabNavigationProp<MainTabParamList>;

export function LocationsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const isDarkMode = useColorScheme() === 'dark';
  
  const {
    locations,
    settings,
    currentLocationIndex,
    setCurrentLocationIndex,
    removeLocation,
  } = useWeatherStore();
  
  const theme = settings.theme;
  const useDark = theme === 'dark' || (theme === 'system' && isDarkMode);
  const themeColors = useDark ? colors.dark : colors.light;

  const getWeatherIcon = (code?: WeatherCode): string => {
    switch (code) {
      case WeatherCode.CLEAR:
        return 'weather-sunny';
      case WeatherCode.PARTLY_CLOUDY:
        return 'weather-partly-cloudy';
      case WeatherCode.CLOUDY:
        return 'weather-cloudy';
      case WeatherCode.RAIN_LIGHT:
      case WeatherCode.RAIN:
        return 'weather-rainy';
      case WeatherCode.RAIN_HEAVY:
        return 'weather-pouring';
      case WeatherCode.SNOW_LIGHT:
      case WeatherCode.SNOW:
        return 'weather-snowy';
      case WeatherCode.THUNDERSTORM:
        return 'weather-lightning-rainy';
      case WeatherCode.FOG:
        return 'weather-fog';
      default:
        return 'weather-sunny';
    }
  };

  const formatTemp = (temp?: number): string => {
    if (temp === undefined) return '--°';
    if (settings.temperatureUnit === 'fahrenheit') {
      return `${Math.round(temp * 9/5 + 32)}°`;
    }
    return `${Math.round(temp)}°`;
  };

  const handleDeleteLocation = (location: Location) => {
    Alert.alert(
      'Delete Location',
      `Are you sure you want to remove ${location.city || 'this location'}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeLocation(location.id),
        },
      ]
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
          styles.locationCard,
          {
            backgroundColor: themeColors.cardBackground,
            borderColor: isSelected ? themeColors.primary : 'transparent',
            borderWidth: isSelected ? 2 : 0,
          },
        ]}
        onPress={() => {
          setCurrentLocationIndex(index);
          navigation.navigate('Home');
        }}
        onLongPress={() => handleDeleteLocation(item)}>
        <View style={styles.locationHeader}>
          <View style={styles.locationInfo}>
            {item.isCurrentPosition && (
              <Icon name="crosshairs-gps" size={14} color={themeColors.primary} />
            )}
            <Text style={[styles.locationName, {color: themeColors.text}]} numberOfLines={1}>
              {item.city || 'Unknown'}
            </Text>
          </View>
          <Text style={[styles.locationRegion, {color: themeColors.textSecondary}]}>
            {[item.province, item.country].filter(Boolean).join(', ')}
          </Text>
        </View>

        <View style={styles.weatherInfo}>
          {current ? (
            <>
              <View style={styles.currentWeather}>
                <Icon
                  name={getWeatherIcon(current.weatherCode)}
                  size={40}
                  color={themeColors.primary}
                />
                <Text style={[styles.temperature, {color: themeColors.text}]}>
                  {formatTemp(current.temperature?.temperature)}
                </Text>
              </View>
              
              <Text style={[styles.weatherText, {color: themeColors.textSecondary}]}>
                {current.weatherText}
              </Text>

              {today && (
                <Text style={[styles.dayNight, {color: themeColors.textTertiary}]}>
                  Day: {formatTemp(today.day?.temperature?.temperature)} • Night: {formatTemp(today.night?.temperature?.temperature)}
                </Text>
              )}
            </>
          ) : (
            <Text style={[styles.noData, {color: themeColors.textSecondary}]}>
              No weather data
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, {backgroundColor: themeColors.background}]}>
      <View style={[styles.header, {paddingTop: insets.top + 16}]}>
        <Text style={[styles.title, {color: themeColors.text}]}>Locations</Text>
        <TouchableOpacity
          style={[styles.addButton, {backgroundColor: themeColors.primary}]}
          onPress={() => navigation.navigate('SearchLocation')}>
          <Icon name="plus" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={locations}
        keyExtractor={(item) => item.id}
        renderItem={renderLocation}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="map-marker-off" size={64} color={themeColors.textSecondary} />
            <Text style={[styles.emptyText, {color: themeColors.text}]}>
              No locations yet
            </Text>
            <Text style={[styles.emptySubtext, {color: themeColors.textSecondary}]}>
              Tap the + button to add a location
            </Text>
          </View>
        }
      />

      <View style={{height: insets.bottom}} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  locationCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationHeader: {
    marginBottom: 12,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationName: {
    fontSize: 18,
    fontWeight: '600',
  },
  locationRegion: {
    fontSize: 13,
    marginTop: 2,
  },
  weatherInfo: {},
  currentWeather: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  temperature: {
    fontSize: 36,
    fontWeight: '300',
  },
  weatherText: {
    fontSize: 14,
    marginTop: 4,
  },
  dayNight: {
    fontSize: 12,
    marginTop: 4,
  },
  noData: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 64,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
});
