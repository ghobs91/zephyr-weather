import React from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import {colors, ColorTheme} from '../theme/colors';
import {
  getGlassMaterial,
  getShadow,
  GlassMaterial,
  withAlpha,
} from '../theme/design';

interface Props {
  children: React.ReactNode;
  isDark: boolean;
  style?: StyleProp<ViewStyle>;
  /** Material thickness — maps to Apple's material hierarchy. */
  variant?: GlassMaterial;
  /** Corner radius override — defaults to the material's radius. */
  radius?: number;
  /** Blur intensity override — defaults to the material's blur amount. */
  blurAmount?: number;
  themeColors?: ColorTheme;
}

/**
 * Liquid glass surface — a blurred, translucent container with a hairline
 * specular rim and a soft top-edge highlight.
 *
 * Uses native BlurView on iOS for true vibrancy, with a gradient-based
 * fallback for Android / reduced-transparency mode. The material itself is
 * neutral; colour comes from the atmospheric background bleeding through.
 */
export function GlassSurface({
  children,
  isDark,
  style,
  variant = 'regular',
  radius,
  blurAmount,
  themeColors,
}: Props) {
  const theme = themeColors ?? (isDark ? colors.dark : colors.light);
  const material = getGlassMaterial(theme, isDark, variant);
  const cornerRadius = radius ?? material.radius;
  const blur = blurAmount ?? material.blurAmount;

  const highlightAlpha = isDark ? 0.08 : 0.28;
  const tintAlpha = isDark ? 0.04 : 0.06;

  return (
    <View
      style={[
        styles.container,
        {
          borderRadius: cornerRadius,
          backgroundColor: material.fill,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: material.border,
          borderCurve: 'continuous',
          ...getShadow(theme, material.shadow),
        },
        style,
      ]}>
      {/* Native blur layer */}
      <BlurView
        style={StyleSheet.absoluteFill}
        blurType={material.blurType}
        blurAmount={blur}
        reducedTransparencyFallbackColor={withAlpha(
          theme.surfaceElevated,
          isDark ? 0.16 : 0.28,
        )}
      />

      {/* Top-edge specular highlight — front-lit glass */}
      <LinearGradient
        colors={[withAlpha('#FFFFFF', highlightAlpha), withAlpha('#FFFFFF', 0)]}
        start={{x: 0.1, y: 0}}
        end={{x: 0.9, y: 0.55}}
        style={[
          styles.highlight,
          {
            borderTopLeftRadius: cornerRadius,
            borderTopRightRadius: cornerRadius,
          },
        ]}
      />

      {/* Barely-there colour tint — keeps the surface from going flat */}
      <LinearGradient
        colors={[
          withAlpha(theme.accent, tintAlpha),
          withAlpha(theme.primary, tintAlpha * 0.5),
          'transparent',
        ]}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={StyleSheet.absoluteFill}
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
