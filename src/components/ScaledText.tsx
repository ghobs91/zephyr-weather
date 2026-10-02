import React, {createContext, useContext} from 'react';
import {Text as RNText, TextProps, StyleSheet, TextStyle} from 'react-native';

/**
 * How much larger type renders on the desktop (macOS) surface. The same point
 * sizes that read well on a phone/iPad look small against a large window, so
 * the desktop shell scales font metrics up a little.
 */
export const DESKTOP_TYPE_SCALE = 1.15;

const TypeScaleContext = createContext(1);

/**
 * Wraps the macOS shell so nested {@link Text} scales its font metrics.
 * Defaults to 1, so mobile rendering is untouched.
 */
export function TypeScaleProvider({
  scale,
  children,
}: {
  scale: number;
  children: React.ReactNode;
}) {
  return (
    <TypeScaleContext.Provider value={scale}>
      {children}
    </TypeScaleContext.Provider>
  );
}

/**
 * Drop-in replacement for React Native's `Text` that scales font size and
 * line height when a non-1 scale is provided by {@link TypeScaleProvider}.
 * Outside the desktop shell it renders the original text untouched.
 */
export function Text({style, ...rest}: TextProps) {
  const scale = useContext(TypeScaleContext);

  if (scale === 1) {
    return <RNText style={style} {...rest} />;
  }

  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const scaled: TextStyle = {};
  if (typeof flat?.fontSize === 'number') {
    scaled.fontSize = flat.fontSize * scale;
  }
  if (typeof flat?.lineHeight === 'number') {
    scaled.lineHeight = flat.lineHeight * scale;
  }

  return <RNText style={[style, scaled]} {...rest} />;
}
