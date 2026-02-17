import {Platform, useWindowDimensions} from 'react-native';

/**
 * Detect if running on macOS via Mac Catalyst.
 * This is a device-level check that doesn't change at runtime.
 */
export function isMacOS(): boolean {
  if (Platform.OS !== 'ios') {
    return false;
  }
  // @ts-ignore - isMacCatalyst is not in TypeScript definitions
  return Platform.isMacCatalyst === true;
}

/**
 * Detect if running on iPad.
 * This is a device-level check that doesn't change at runtime.
 */
export function isIPad(): boolean {
  if (Platform.OS !== 'ios') {
    return false;
  }
  // @ts-ignore - isPad is not in TypeScript definitions
  return Platform.isPad === true;
}

/** Responsive layout breakpoints */
export interface ResponsiveLayout {
  /** Window width in points */
  windowWidth: number;
  /** Window height in points */
  windowHeight: number;
  /** True when device is macOS Catalyst */
  isDesktop: boolean;
  /** True for iPad or wide-screen (>= 600pt wide) */
  isWideScreen: boolean;
  /** True when the window is wide enough for multi-column layout (>= 700pt) */
  isMultiColumn: boolean;
  /** Horizontal padding for the main content area */
  contentPadding: number;
  /** Maximum width for the main content column (undefined = full width) */
  maxContentWidth: number | undefined;
  /** Number of detail-card columns (2 on compact, 4 on wide) */
  detailColumns: number;
}

/**
 * Reactive hook that returns layout metrics based on the current window size.
 * Updates automatically on rotation, multitasking resize, etc.
 */
export function useResponsiveLayout(): ResponsiveLayout {
  const {width, height} = useWindowDimensions();
  const isDesktop = isMacOS();

  // Wide-screen: iPad in any orientation, large Android tablet, or macOS
  const isWideScreen = isDesktop || width >= 600;
  // Multi-column: enough room for a sidebar + content
  const isMultiColumn = isDesktop || width >= 700;

  let contentPadding: number;
  let maxContentWidth: number | undefined;
  let detailColumns: number;

  if (isDesktop) {
    contentPadding = 32;
    maxContentWidth = 900;
    detailColumns = 4;
  } else if (width >= 1024) {
    // Very wide iPad (landscape full-screen, etc.)
    contentPadding = 40;
    maxContentWidth = 800;
    detailColumns = 4;
  } else if (width >= 700) {
    // iPad portrait or slide-over landscape
    contentPadding = 28;
    maxContentWidth = 700;
    detailColumns = 4;
  } else if (width >= 600) {
    // Narrow iPad split-view or large phone landscape
    contentPadding = 24;
    maxContentWidth = 600;
    detailColumns = 2;
  } else {
    // Phone portrait
    contentPadding = 16;
    maxContentWidth = undefined; // full width
    detailColumns = 2;
  }

  return {
    windowWidth: width,
    windowHeight: height,
    isDesktop,
    isWideScreen,
    isMultiColumn,
    contentPadding,
    maxContentWidth,
    detailColumns,
  };
}

/**
 * @deprecated Use useResponsiveLayout().isDesktop instead
 */
export function useDesktopLayout(): boolean {
  return isMacOS();
}

/**
 * @deprecated Use useResponsiveLayout().isWideScreen instead
 */
export function useTabletLayout(): boolean {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const {width} = useWindowDimensions();
  return !isMacOS() && (isIPad() || width >= 600);
}
