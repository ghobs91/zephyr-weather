import {Platform, Dimensions} from 'react-native';

/**
 * Detect if running on macOS via Mac Catalyst
 * Check Platform interface idiom and window dimensions
 */
export function isMacOS(): boolean {
  if (Platform.OS !== 'ios') {
    return false;
  }
  
  // Check if running on Mac Catalyst
  // @ts-ignore - isMacCatalyst is not in TypeScript definitions
  const isCatalyst = Platform.isMacCatalyst === true;
  
  // Log for debugging
  const {width, height} = Dimensions.get('window');
  console.log('[Platform Detection]', {
    isCatalyst,
    width,
    height,
    // @ts-ignore
    constants: Platform.constants,
  });
  
  if (isCatalyst) {
    return true;
  }
  
  // Fallback: Check window dimensions
  // Mac Catalyst windows are typically wider and have different aspect ratios
  return width >= 900 && height >= 600;
}

/**
 * Detect if running on iPad
 */
export function isIPad(): boolean {
  if (Platform.OS !== 'ios') {
    return false;
  }
  
  // Check if it's iPad via isPad property
  // @ts-ignore - isPad is not in TypeScript definitions
  if (Platform.isPad === true) {
    return true;
  }
  
  // Fallback: Check screen dimensions
  // iPads are typically 768px or wider
  const {width, height} = Dimensions.get('window');
  const minDimension = Math.min(width, height);
  const maxDimension = Math.max(width, height);
  
  return minDimension >= 768 && maxDimension >= 1024;
}

/**
 * Detect if device is a tablet (iPad or large Android tablet)
 */
export function isTablet(): boolean {
  if (Platform.OS === 'ios') {
    return isIPad();
  }
  
  // For Android, check screen dimensions
  const {width, height} = Dimensions.get('window');
  const minDimension = Math.min(width, height);
  return minDimension >= 600; // 600dp is typical tablet breakpoint
}

/**
 * Get whether to use desktop/sidebar layout
 */
export function useDesktopLayout(): boolean {
  return isMacOS();
}

/**
 * Get whether to use tablet-optimized layout
 */
export function useTabletLayout(): boolean {
  return isTablet() && !isMacOS();
}
