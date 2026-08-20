import React, {useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import {Swipeable} from 'react-native-gesture-handler';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {useWeatherStore} from '../store/weatherStore';
import {useThemeColors} from '../hooks/useThemeColors';
import {AtmosphericBackground} from '../components/AtmosphericBackground';
import {getCardStyle, withAlpha} from '../theme/design';
import {Location} from '../types/weather';
import {RootStackParamList} from '../navigation/RootNavigator';
import {WeatherIcon} from '../components/WeatherIcon';
import {useResponsiveLayout} from '../utils/platformDetect';
import {formatTempShort} from '../utils/formatting';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function LocationsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  
  const {
    locations,
    settings,
    currentLocationIndex,
    setCurrentLocationIndex,
    removeLocation,
  } = useWeatherStore();
  
  const {useDark, themeColors} = useThemeColors();
  const layout = useResponsiveLayout();

  const formatTemp = (temp?: number): string => formatTempShort(temp, settings.temperatureUnit);

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

    const renderRightActions = (progress: Animated.AnimatedInterpolation<number>) => {
      const translateX = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [80, 0],
      });
      return (
        <Animated.View style={[styles.deleteAction, {transform: [{translateX}]}]}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => removeLocation(item.id)}>
            <Icon name="trash-can-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      );
    };

    return (
      <Swipeable
        renderRightActions={renderRightActions}
        rightThreshold={40}
        overshootRight={false}>
        <View style={[
        styles.itemWrapper,
        {
          paddingHorizontal: layout.contentPadding,
          maxWidth: layout.maxContentWidth,
          alignSelf: layout.maxContentWidth ? 'center' : undefined,
          width: layout.maxContentWidth ? '100%' : undefined,
        },
      ]}>
        <TouchableOpacity
        style={[
          styles.locationCard,
          getCardStyle(themeColors),
          {
            backgroundColor: isSelected
              ? withAlpha(themeColors.primary, useDark ? 0.18 : 0.12)
              : themeColors.cardBackground,
            borderColor: isSelected ? withAlpha(themeColors.primary, 0.40) : themeColors.cardBorder,
            borderWidth: 1,
          },
        ]}
        onPress={() => {
          setCurrentLocationIndex(index);
          navigation.goBack();
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
                <WeatherIcon
                  code={current.weatherCode}
                  isDay={current.isDaylight}
                  style={styles.weatherIcon}
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
        </View>
      </Swipeable>
    );
  };

  return (
    <AtmosphericBackground isDark={useDark}>
      <View style={styles.container}>
      <View style={[styles.header, {paddingTop: insets.top + 16}]}> 
        <View>
          <Text style={[styles.title, {color: themeColors.text}]}>Locations</Text>
          <Text style={[styles.subtitle, {color: themeColors.textSecondary}]}>Choose a city, reorder by use, or remove old places.</Text>
        </View>
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
          <View style={[
            styles.emptyWrapper,
            {
              paddingHorizontal: layout.contentPadding,
              maxWidth: layout.maxContentWidth,
              alignSelf: layout.maxContentWidth ? 'center' : undefined,
              width: layout.maxContentWidth ? '100%' : undefined,
            },
          ]}>
            <View style={styles.emptyContainer}>
            <Icon name="map-marker-off" size={64} color={themeColors.textSecondary} />
            <Text style={[styles.emptyText, {color: themeColors.text}]}>
              No locations yet
            </Text>
            <Text style={[styles.emptySubtext, {color: themeColors.textSecondary}]}>
              Tap the + button to add a location
            </Text>
            </View>
          </View>
        }
      />

      <View style={{height: insets.bottom}} />
      </View>
    </AtmosphericBackground>
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
    fontSize: 32,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 6,
    maxWidth: 260,
    lineHeight: 20,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: 16,
  },
  itemWrapper: {
    marginBottom: 12,
  },
  emptyWrapper: {
    flex: 1,
  },
  locationCard: {
    borderRadius: 24,
    padding: 16,
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
  weatherIcon: {
    width: 40,
    height: 40,
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
  deleteAction: {
    justifyContent: 'center',
    marginBottom: 12,
    marginRight: 16,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 72,
    borderRadius: 24,
    alignSelf: 'stretch',
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
