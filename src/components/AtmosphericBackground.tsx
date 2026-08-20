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
 * iOS 27-style layered background with large, soft-edged organic orbs
 * that "bleed" vibrant colour through the translucent glass surfaces
 * stacked on top. The effect creates a sense of depth and fluidity
 * without being distracting.
 */
export function AtmosphericBackground({children, isDark, style}: Props) {
  const theme = getThemeColors(isDark);
  const useDark = isDark;

  return (
    <View style={[styles.container, style]}>
      {/* ── Sky gradient base ──────────────────────────────────── */}
      <LinearGradient
        colors={getScreenGradient(theme)}
        locations={useDark ? [0, 0.22, 1] : [0, 0.38, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Primary orb — large, top-right ─────────────────────── */}
      <View
        pointerEvents="none"
        style={[
          styles.orb,
          styles.orbPrimary,
          {backgroundColor: getLiquidOrbColor(theme, 'primary')},
        ]}
      />

      {/* ── Secondary orb — mid-left, warm amber glow ──────────── */}
      <View
        pointerEvents="none"
        style={[
          styles.orb,
          styles.orbSecondary,
          {backgroundColor: getLiquidOrbColor(theme, 'secondary')},
        ]}
      />

      {/* ── Accent orb — bottom-right, cool liquid bleed ───────── */}
      <View
        pointerEvents="none"
        style={[
          styles.orb,
          styles.orbAccent,
          {backgroundColor: getLiquidOrbColor(theme, 'accent')},
        ]}
      />

      {/* ── Subtle haze overlay — ties orbs together ──────────── */}
      <View
        pointerEvents="none"
        style={[
          styles.haze,
          {backgroundColor: withAlpha(theme.liquidGlow, useDark ? 0.06 : 0.10)},
        ]}
      />

      {/* ── Top-edge highlight — simulates light source ────────── */}
      <LinearGradient
        pointerEvents="none"
        colors={[
          withAlpha('#FFFFFF', useDark ? 0.04 : 0.18),
          'transparent',
        ]}
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
    // Soft blur-like edges via large size + low opacity
  },
  orbPrimary: {
    width: 340,
    height: 340,
    top: -140,
    right: -80,
  },
  orbSecondary: {
    width: 260,
    height: 260,
    top: '32%',
    left: -110,
  },
  orbAccent: {
    width: 380,
    height: 380,
    bottom: -170,
    right: -130,
  },
  haze: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: 999,
    bottom: -260,
    left: -180,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
});
