import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  useColorScheme,
  Modal,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {useWeatherStore} from '../store/weatherStore';
import {colors} from '../theme/colors';
import {RootStackParamList} from '../navigation/RootNavigator';
import {LocationSidebar} from '../components/LocationSidebar';
import {HomeScreen} from './HomeScreen';
import {SettingsScreen} from './SettingsScreen';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function MacOSHomeScreen() {
  console.log('[MacOSHomeScreen] Rendering macOS layout');
  const navigation = useNavigation<NavigationProp>();
  const isDarkMode = useColorScheme() === 'dark';
  const [showSettings, setShowSettings] = useState(false);
  
  const {
    settings,
    setCurrentLocationIndex,
  } = useWeatherStore();
  
  const theme = settings.theme;
  const useDark = theme === 'dark' || (theme === 'system' && isDarkMode);
  const themeColors = useDark ? colors.dark : colors.light;

  const handleLocationSelect = (index: number) => {
    setCurrentLocationIndex(index);
  };

  const handleSearchPress = () => {
    navigation.navigate('SearchLocation');
  };

  const handleSettingsPress = () => {
    setShowSettings(true);
  };

  return (
    <View style={[styles.container, {backgroundColor: themeColors.background}]}>
      <LocationSidebar
        isDark={useDark}
        themeColors={themeColors}
        onLocationSelect={handleLocationSelect}
        onSearchPress={handleSearchPress}
        onSettingsPress={handleSettingsPress}
      />
      <View style={styles.detailContainer}>
        <HomeScreen />
      </View>

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSettings(false)}>
        <SettingsScreen onClose={() => setShowSettings(false)} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  detailContainer: {
    flex: 1,
  },
});
