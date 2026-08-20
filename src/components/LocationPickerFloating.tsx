import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {ColorTheme} from '../theme/colors';
import {getGlassPillStyle} from '../theme/design';
import {Location} from '../types/weather';
import {WeatherIcon} from './WeatherIcon';

interface PickerState {
  pickerOpen: boolean;
  pickerAnim: Animated.Value;
  openPicker: () => void;
  closePicker: () => void;
}

interface Props {
  locations: Location[];
  pageIndex: number;
  currentLocation: Location;
  picker: PickerState;
  formatTempShort: (temp?: number) => string;
  themeColors: ColorTheme;
  useDark: boolean;
  insets: {top: number; bottom: number};
  onSelect: (index: number) => void;
  onMenuPress: () => void;
  onSettingsPress: () => void;
}

export function LocationPickerFloating({
  locations,
  pageIndex,
  currentLocation,
  picker,
  formatTempShort,
  themeColors,
  useDark,
  insets,
  onSelect,
  onMenuPress,
  onSettingsPress,
}: Props) {
  const {pickerOpen, pickerAnim, openPicker, closePicker} = picker;

  return (
    <>
      {/* Backdrop */}
      {pickerOpen && (
        <TouchableOpacity
          style={styles.backdrop}
          onPress={closePicker}
          activeOpacity={1}
        />
      )}

      {/* Top bar row */}
      <View style={[styles.floating, {top: insets.top + 8}]} pointerEvents="box-none">
        {/* Hamburger */}
        <TouchableOpacity
          style={[styles.iconPill, getGlassPillStyle(themeColors)]}
          onPress={onMenuPress}
          activeOpacity={0.8}>
          <Icon name="menu" size={24} color={themeColors.textSecondary} />
        </TouchableOpacity>

        {/* Center: city picker pill + dropdown */}
        <View style={styles.center} pointerEvents="box-none">
          <TouchableOpacity
            style={[styles.pickerPill, getGlassPillStyle(themeColors)]}
            onPress={pickerOpen ? closePicker : openPicker}
            activeOpacity={0.8}>
            {currentLocation.isCurrentPosition && (
              <Icon name="crosshairs-gps" size={14} color={themeColors.primary} />
            )}
            <Text
              style={[styles.cityText, {color: themeColors.text}]}
              numberOfLines={1}>
              {currentLocation.city || 'Unknown Location'}
            </Text>
            <Icon
              name={pickerOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={themeColors.textSecondary}
            />
          </TouchableOpacity>

          {pickerOpen && (
            <Animated.View
              style={[
                styles.dropdown,
                {
                  backgroundColor: useDark
                    ? 'rgba(10, 21, 37, 0.94)'
                    : 'rgba(245, 252, 255, 0.92)',
                },
                {
                  opacity: pickerAnim,
                  transform: [
                    {
                      translateY: pickerAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-8, 0],
                      }),
                    },
                  ],
                },
              ]}>
              {locations.map((loc, index) => {
                const isSelected = index === pageIndex;
                const locCurrent = loc.weather?.current;
                const locToday = loc.weather?.dailyForecast?.[0];
                return (
                  <TouchableOpacity
                    key={loc.id}
                    style={[
                      styles.dropdownItem,
                      isSelected && {
                        backgroundColor: useDark
                          ? 'rgba(255,255,255,0.08)'
                          : 'rgba(0,0,0,0.06)',
                      },
                    ]}
                    onPress={() => onSelect(index)}>
                    <View style={styles.itemLeft}>
                      {loc.isCurrentPosition && (
                        <Icon
                          name="crosshairs-gps"
                          size={13}
                          color={themeColors.primary}
                          style={{marginRight: 4}}
                        />
                      )}
                      <View>
                        <Text
                          style={[styles.itemCity, {color: themeColors.text}]}
                          numberOfLines={1}>
                          {loc.city || 'Unknown'}
                        </Text>
                        {locToday && (
                          <Text style={[styles.itemSub, {color: themeColors.textSecondary}]}>
                            H:{formatTempShort(locToday.day?.temperature?.temperature)} · L:{formatTempShort(locToday.night?.temperature?.temperature)}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.itemRight}>
                      {locCurrent && (
                        <>
                          <WeatherIcon
                            code={locCurrent.weatherCode}
                            isDay={locCurrent.isDaylight}
                            style={styles.itemIcon}
                          />
                          <Text style={[styles.itemTemp, {color: themeColors.text}]}>
                            {formatTempShort(locCurrent.temperature?.temperature)}
                          </Text>
                        </>
                      )}
                      {isSelected && (
                        <Icon
                          name="check"
                          size={16}
                          color={themeColors.primary}
                          style={{marginLeft: 6}}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </Animated.View>
          )}
        </View>

        {/* Settings */}
        <TouchableOpacity
          style={[styles.iconPill, getGlassPillStyle(themeColors)]}
          onPress={onSettingsPress}
          activeOpacity={0.8}>
          <Icon name="cog-outline" size={24} color={themeColors.textSecondary} />
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
    zIndex: 100,
  },
  floating: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 101,
  },
  iconPill: {
    width: 46,
    height: 46,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {flex: 1, alignItems: 'center'},
  pickerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 25,
    width: 220,
  },
  cityText: {fontSize: 15, fontWeight: '600', flex: 1, textAlign: 'center'},
  dropdown: {
    marginTop: 8,
    borderRadius: 24,
    borderWidth: 0,
    overflow: 'hidden',
    width: 260,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  itemLeft: {flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12},
  itemCity: {fontSize: 15, fontWeight: '600'},
  itemSub: {fontSize: 12, marginTop: 2},
  itemRight: {flexDirection: 'row', alignItems: 'center'},
  itemIcon: {width: 24, height: 24},
  itemTemp: {fontSize: 15, fontWeight: '600', marginLeft: 8},
});
