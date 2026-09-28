import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {useWeatherStore} from '../store/weatherStore';
import {RootStackParamList} from '../navigation/RootNavigator';
import {useResponsiveLayout} from '../utils/platformDetect';
import {useThemeColors} from '../hooks/useThemeColors';
import {useWeatherFormatters} from '../hooks/useWeatherFormatters';
import {useLocationPicker} from '../hooks/useLocationPicker';
import {useWeatherRefresh} from '../hooks/useWeatherRefresh';
import {useDefaultLocation} from '../hooks/useDefaultLocation';

import {AtmosphericBackground} from '../components/AtmosphericBackground';
import {EmptyState} from '../components/EmptyState';
import {LoadingState} from '../components/LoadingState';
import {SkeletonCards} from '../components/SkeletonCards';
import {LocationPickerFloating} from '../components/LocationPickerFloating';
import {FloatingGlassButton} from '../components/FloatingGlassButton';
import {LocationWeatherContent} from '../components/LocationWeatherContent';
import {Location} from '../types/weather';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

/** A single vertical weather page. One per location in the mobile pager. */
function HomeContentPage({
  location,
  pageWidth,
}: {
  location: Location;
  pageWidth?: number;
}) {
  const insets = useSafeAreaInsets();
  const layout = useResponsiveLayout();
  const {isDesktop, isWideScreen, contentPadding, maxContentWidth} = layout;
  const {useDark, themeColors} = useThemeColors();
  const isLoading = useWeatherStore((s) => s.isLoading);
  const {refreshing, onRefresh} = useWeatherRefresh(location);
  const showSkeleton = isLoading && !location.weather;

  return (
    <ScrollView
      style={[styles.scrollView, pageWidth != null && {width: pageWidth}]}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={themeColors.primary}
        />
      }
      showsVerticalScrollIndicator={false}>
      <View
        style={[
          styles.contentContainer,
          {
            paddingTop: isDesktop || isWideScreen ? 20 : insets.top,
            paddingHorizontal: contentPadding,
            maxWidth: maxContentWidth,
            alignSelf: maxContentWidth ? 'center' : undefined,
            width: maxContentWidth ? '100%' : undefined,
          },
        ]}>
        {/* Spacer for the floating location picker on mobile */}
        {!isDesktop && <View style={styles.pickerSpacer} />}

        {showSkeleton ? (
          <SkeletonCards themeColors={themeColors} isDark={useDark} count={4} />
        ) : (
          <>
            <LocationWeatherContent location={location} isDesktop={isDesktop} />
            <View style={{height: insets.bottom + 96}} />
          </>
        )}
      </View>
    </ScrollView>
  );
}

export function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const {useDark, themeColors, backgroundKey} = useThemeColors();
  const layout = useResponsiveLayout();
  const {isDesktop, windowWidth} = layout;
  const {formatTempShort} = useWeatherFormatters();

  const {
    locations,
    currentLocationIndex,
    setCurrentLocationIndex,
    removeLocation,
  } = useWeatherStore();

  const [pageIndex, setPageIndex] = useState(currentLocationIndex);
  const picker = useLocationPicker();
  const pagerRef = useRef<FlatList<Location>>(null);

  useDefaultLocation();
  const currentLocation = locations[pageIndex];

  // Sync pageIndex with external changes (e.g. LocationsScreen) and scroll
  // the pager to match.
  useEffect(() => {
    setPageIndex(currentLocationIndex);
    if (!isDesktop && locations.length > 0) {
      pagerRef.current?.scrollToIndex({
        index: currentLocationIndex,
        animated: false,
      });
    }
  }, [currentLocationIndex, isDesktop, locations.length]);

  if (locations.length === 0) {
    return (
      <EmptyState
        themeColors={themeColors}
        onAdd={() => navigation.navigate('SearchLocation')}
      />
    );
  }

  if (!currentLocation) {
    return <LoadingState themeColors={themeColors} />;
  }

  const selectLocation = (index: number) => {
    setCurrentLocationIndex(index);
    setPageIndex(index);
    picker.closePicker();
    pagerRef.current?.scrollToIndex({index, animated: true});
  };

  const handleDeleteLocation = (location: Location) => {
    Alert.alert(
      'Delete Location',
      `Remove ${location.city || 'this location'}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeLocation(location.id),
        },
      ],
    );
  };

  return (
    <AtmosphericBackground isDark={useDark} backgroundKey={backgroundKey}>
      <View style={styles.container}>
        {isDesktop ? (
          <HomeContentPage location={currentLocation} />
        ) : (
          <FlatList
            ref={pagerRef}
            data={locations}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={pageIndex}
            getItemLayout={(_, index) => ({
              length: windowWidth,
              offset: windowWidth * index,
              index,
            })}
            renderItem={({item}) => (
              <HomeContentPage location={item} pageWidth={windowWidth} />
            )}
            onMomentumScrollEnd={(event) => {
              const index = Math.max(
                0,
                Math.min(
                  locations.length - 1,
                  Math.round(event.nativeEvent.contentOffset.x / windowWidth),
                ),
              );
              if (index !== pageIndex) {
                setPageIndex(index);
                setCurrentLocationIndex(index);
              }
            }}
          />
        )}

        {!isDesktop && (
          <LocationPickerFloating
            locations={locations}
            pageIndex={pageIndex}
            currentLocation={currentLocation}
            picker={picker}
            formatTempShort={formatTempShort}
            themeColors={themeColors}
            isDark={useDark}
            insets={insets}
            onSelect={selectLocation}
            onDelete={handleDeleteLocation}
          />
        )}

        {!isDesktop && (
          <View
            style={[styles.fabRow, {bottom: insets.bottom + 20}]}
            pointerEvents="box-none">
            <FloatingGlassButton
              icon="magnify"
              accessibilityLabel="Search locations"
              onPress={() => navigation.navigate('SearchLocation')}
              themeColors={themeColors}
              isDark={useDark}
            />
            <FloatingGlassButton
              icon="radar"
              accessibilityLabel="Radar"
              onPress={() => navigation.navigate('Radar')}
              themeColors={themeColors}
              isDark={useDark}
            />
            <FloatingGlassButton
              icon="cog-outline"
              accessibilityLabel="Settings"
              onPress={() => navigation.navigate('Settings')}
              themeColors={themeColors}
              isDark={useDark}
            />
          </View>
        )}
      </View>
    </AtmosphericBackground>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  scrollView: {flex: 1},
  scrollContent: {flexGrow: 1},
  contentContainer: {paddingBottom: 8},
  pickerSpacer: {height: 66},
  fabRow: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
