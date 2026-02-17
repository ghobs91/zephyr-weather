import {NativeModules, Platform} from 'react-native';
import {format} from 'date-fns';
import {TimeFormat} from '../types/settings';

/**
 * Detects if the user's locale defaults to 12-hour or 24-hour time format
 */
export function getLocaleTimeFormat(): '12h' | '24h' {
  try {
    // Method 1: Try to get the hour cycle from Intl.DateTimeFormat
    try {
      const formatter = new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: 'numeric',
      });
      const resolved = formatter.resolvedOptions();
      
      // Check if hourCycle is available (modern browsers/React Native)
      if ('hourCycle' in resolved) {
        const hourCycle = (resolved as any).hourCycle;
        if (hourCycle === 'h11' || hourCycle === 'h12') {
          return '12h';
        }
        if (hourCycle === 'h23' || hourCycle === 'h24') {
          return '24h';
        }
      }
    } catch (e) {
      console.log('Hour cycle detection failed:', e);
    }
    
    // Method 2: Format a test time and check the output
    const testDate = new Date(2024, 0, 1, 13, 0, 0); // 1:00 PM
    const formatted = new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: 'numeric',
    }).format(testDate);
    
    console.log('Formatted test time:', formatted);
    
    // If the formatted time includes 'PM' or 'AM', it's 12-hour format
    if (formatted.includes('PM') || formatted.includes('AM') || 
        formatted.includes('pm') || formatted.includes('am') ||
        formatted.includes('p.m.') || formatted.includes('a.m.')) {
      return '12h';
    }
    
    // Check if it shows '13' (24-hour) or '1' (12-hour without AM/PM)
    if (formatted.includes('13')) {
      return '24h';
    }
    
    // Method 3: Try to detect locale
    let detectedLocale: string | undefined;
    
    if (Platform.OS === 'ios') {
      detectedLocale = NativeModules.SettingsManager?.settings?.AppleLocale ||
                      NativeModules.SettingsManager?.settings?.AppleLanguages?.[0];
    } else if (Platform.OS === 'android') {
      detectedLocale = NativeModules.I18nManager?.localeIdentifier;
    }
    
    // Check browser/system locale as fallback
    if (!detectedLocale && typeof navigator !== 'undefined') {
      detectedLocale = navigator.language || (navigator as any).userLanguage;
    }
    
    console.log('Detected locale:', detectedLocale);
    
    // Default to 12h for US, Canada, Australia, Philippines, and other English locales
    if (detectedLocale) {
      const locale = detectedLocale.toLowerCase();
      if (locale.startsWith('en-us') || locale.startsWith('en-ca') || 
          locale.startsWith('en-au') || locale.startsWith('en-ph') ||
          locale === 'en') {
        return '12h';
      }
    }
    
    // Default to 12h for common US setup
    return '12h';
  } catch (error) {
    console.warn('Error detecting locale time format:', error);
    // Default to 12h on error as it's more common in US
    return '12h';
  }
}

/**
 * Formats time according to the user's time format setting
 */
export function formatTime(
  date: Date | undefined,
  timeFormatSetting: TimeFormat,
  options?: {
    showMinutes?: boolean;
    lowercase?: boolean;
  }
): string {
  if (!date) return '--:--';
  
  const {showMinutes = true, lowercase = false} = options || {};
  
  // Determine the actual format to use
  let use12Hour: boolean;
  if (timeFormatSetting === 'auto') {
    use12Hour = getLocaleTimeFormat() === '12h';
  } else {
    use12Hour = timeFormatSetting === '12h';
  }
  
  // Format the time
  let formatString: string;
  if (use12Hour) {
    formatString = showMinutes ? 'h:mm a' : 'ha';
  } else {
    formatString = showMinutes ? 'HH:mm' : 'HH';
  }
  
  let formatted = format(date, formatString);
  
  if (lowercase) {
    formatted = formatted.toLowerCase();
  }
  
  return formatted;
}

/**
 * Formats time for hourly displays (either "Now" or time based on setting)
 */
export function formatHourlyTime(
  date: Date,
  isNow: boolean,
  timeFormatSetting: TimeFormat
): string {
  if (isNow) return 'Now';
  return formatTime(date, timeFormatSetting, {showMinutes: true});
}
