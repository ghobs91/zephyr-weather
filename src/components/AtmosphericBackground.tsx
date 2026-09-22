import React from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  getScreenGradient,
  getThemeColors,
  getLiquidOrbColor,
  withAlpha,
} from '../theme/design';

interface Props {
  children: React.ReactNode;
  isDark: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Liquid glass atmospheric background.
 *
 * A soft sky gradient with two faint, oversized colour orbs that bleed
 * gently through the translucent glass above. Deliberately restrained so
 * the material — not the backdrop — carries the interface.
 */
export function AtmosphericBackground({children, isDark, style}: Props) {
  const theme = getThemeColors(isDark);
  const useDark = isDark;

  return (
    <View style={[styles.container, style]}>
      {/* ── Sky gradient base ──────────────────────────────────── */}
      <LinearGradient
        colors={getScreenGradient(theme)}
        locations={useDark ? [0, 0.30, 1] : [0, 0.42, 1]}
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
        colors={[withAlpha('#FFFFFF', useDark ? 0.04 : 0.16), 'transparent']}
        locations={[0, 1]}
        style={styles.topHighlight}
      />

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
