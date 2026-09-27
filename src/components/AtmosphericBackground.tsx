import React from 'react';
import {Image, StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  getScreenGradient,
  getThemeColors,
  getLiquidOrbColor,
  withAlpha,
} from '../theme/design';
import {
  getWeatherBackgroundSource,
  WeatherBackgroundKey,
} from '../utils/weatherBackgrounds';

interface Props {
  children: React.ReactNode;
  isDark: boolean;
  /** Condition backdrop; falls back to the atmospheric gradient when absent. */
  backgroundKey?: WeatherBackgroundKey;
  style?: StyleProp<ViewStyle>;
}

/**
 * Condition-driven full-screen backdrop.
 *
 * When weather is available the current condition photo fills the screen
 * behind a legibility scrim; otherwise the atmospheric gradient (with soft
 * colour orbs) stands in during loading and no-data states. Card material
 * floats above either backdrop, which is what the glass is picking up.
 */
export function AtmosphericBackground({
  children,
  isDark,
  backgroundKey,
  style,
}: Props) {
  const theme = getThemeColors(isDark);

  return (
    <View style={[styles.container, style]}>
      {backgroundKey ? (
        <>
          <Image
            source={getWeatherBackgroundSource(backgroundKey)}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />

          {/* Legibility scrim — darker in dark mode, bright wash in light */}
          <LinearGradient
            pointerEvents="none"
            colors={
              isDark
                ? [
                    withAlpha('#000000', 0.58),
                    withAlpha('#000000', 0.22),
                    withAlpha('#000000', 0.62),
                  ]
                : [
                    withAlpha('#FFFFFF', 0.30),
                    withAlpha('#FFFFFF', 0.10),
                    withAlpha('#FFFFFF', 0.34),
                  ]
            }
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
        </>
      ) : (
        <>
          {/* ── Sky gradient base ──────────────────────────────────── */}
          <LinearGradient
            colors={getScreenGradient(theme)}
            locations={isDark ? [0, 0.30, 1] : [0, 0.42, 1]}
            style={StyleSheet.absoluteFill}
          />

          {/* ── Primary orb — soft light, top-right ────────────────── */}
          <View
            pointerEvents="none"
            style={[
              styles.orb,
              styles.orbPrimary,
              {backgroundColor: getLiquidOrbColor(theme, 'accent')},
            ]}
          />

          {/* ── Secondary orb — warm glow, lower-left ──────────────── */}
          <View
            pointerEvents="none"
            style={[
              styles.orb,
              styles.orbSecondary,
              {backgroundColor: getLiquidOrbColor(theme, 'secondary')},
            ]}
          />

          {/* ── Top-edge highlight — simulates light source ────────── */}
          <LinearGradient
            pointerEvents="none"
            colors={[withAlpha('#FFFFFF', isDark ? 0.04 : 0.16), 'transparent']}
            locations={[0, 1]}
            style={styles.topHighlight}
          />
        </>
      )}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbPrimary: {
    width: 420,
    height: 420,
    top: -180,
    right: -120,
  },
  orbSecondary: {
    width: 320,
    height: 320,
    bottom: -140,
    left: -120,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
  },
});
