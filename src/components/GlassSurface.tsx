import React from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import {colors, ColorTheme} from '../theme/colors';
import {getGlassOverlayColors, withAlpha} from '../theme/design';

interface Props {
  children: React.ReactNode;
  isDark: boolean;
  style?: StyleProp<ViewStyle>;
  /** Corner radius — defaults to 32 (liquid glass standard). */
  radius?: number;
  /** Blur intensity — defaults to 18 for deeper liquid effect. */
  blurAmount?: number;
  themeColors?: ColorTheme;
}

/**
 * Liquid glass surface — a blurred, translucent container with subtle
 * highlight and tint gradients that simulate front-lit glass.
 *
 * Uses native BlurView on iOS for true vibrancy, with a gradient-based
 * fallback for Android / reduced-transparency mode.
 */
export function GlassSurface({
  children,
  isDark,
  style,
  radius = 32,
  blurAmount = 18,
  themeColors,
}: Props) {
  const theme = themeColors ?? (isDark ? colors.dark : colors.light);

  // Softer glass overlay with less opacity — lets more colour bleed through.
  const highlightAlpha = isDark ? 0.08 : 0.28;
  const tintAlpha = isDark ? 0.06 : 0.08;
  const baseAlpha = isDark ? 0.10 : 0.18;

  return (
    <View style={[styles.container, {borderRadius: radius}, style]}>
      {/* Native blur layer */}
      <BlurView
        style={StyleSheet.absoluteFill}
        blurType={isDark ? 'dark' : 'light'}
        blurAmount={blurAmount}
        reducedTransparencyFallbackColor={withAlpha(theme.surfaceElevated, baseAlpha)}
      />

      {/* Top-edge highlight — simulates front-lit glass */}
      <LinearGradient
        colors={[
          withAlpha('#FFFFFF', highlightAlpha),
          withAlpha('#FFFFFF', 0),
        ]}
        start={{x: 0.1, y: 0}}
        end={{x: 0.9, y: 0.55}}
        style={[
          styles.highlight,
          {
            borderTopLeftRadius: radius,
            borderTopRightRadius: radius,
          },
        ]}
      />

      {/* Subtle colour tint gradient */}
      <LinearGradient
        colors={[
          withAlpha(theme.accent, tintAlpha),
          withAlpha(theme.primary, tintAlpha * 0.6),
          withAlpha(theme.surfaceElevated, baseAlpha * 0.4),
        ]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={StyleSheet.absoluteFill}
      />

      {/* Micro-surface fill (just enough to catch shadows) */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: radius,
            backgroundColor: withAlpha(theme.surfaceElevated, isDark ? 0.04 : 0.06),
          },
        ]}
      />

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '44%',
  },
});
