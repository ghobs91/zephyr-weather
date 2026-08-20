import {useEffect, useState} from 'react';
import {Platform, PermissionsAndroid, Alert} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import {useWeatherStore} from '../store/weatherStore';

/**
 * Seeds the first location on app launch.
 * Tries to use the device's current position via geolocation first,
 * then falls back to New York if permission is denied or geolocation fails.
 */
export function useDefaultLocation() {
  const locations = useWeatherStore(state => state.locations);
  const addLocation = useWeatherStore(state => state.addLocation);
  const [triedGeolocation, setTriedGeolocation] = useState(false);

  useEffect(() => {
    if (locations.length > 0 || triedGeolocation) return;
    setTriedGeolocation(true);

    const addFallbackLocation = () => {
      addLocation({
        id: 'default',
        latitude: 40.7128,
        longitude: -74.006,
        timezone: 'America/New_York',
        city: 'New York',
        province: 'New York',
        country: 'United States',
        countryCode: 'US',
        isCurrentPosition: false,
        forecastSource: 'nws',
      });
    };

    const requestAndFetch = async () => {
      try {
        // Request permission on Android
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Location Permission',
              message:
                'Zephyr Weather uses your location to show local weather.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            },
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            addFallbackLocation();
            return;
          }
        }

        // Get current position
        Geolocation.getCurrentPosition(
          async position => {
            try {
              const {latitude, longitude} = position.coords;

              // Reverse geocode to get the city name
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
                {headers: {'User-Agent': 'ZephyrWeather/1.0'}},
              );
              const data = await response.json();

              const city =
                data.address?.city ||
                data.address?.town ||
                data.address?.village ||
                data.address?.municipality;
              const province = data.address?.state || data.address?.region;
              const country = data.address?.country;
              const countryCode = data.address?.country_code?.toUpperCase();

              // Determine timezone from the position
              const tzResponse = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&timezone=auto`,
                {headers: {'User-Agent': 'ZephyrWeather/1.0'}},
              );
              const tzData = await tzResponse.json();
              const timezone = tzData.timezone || 'UTC';

              addLocation({
                id: 'current-location',
                latitude: Math.round(latitude * 10000) / 10000,
                longitude: Math.round(longitude * 10000) / 10000,
                timezone,
                city: city || 'Current Location',
                province,
                country,
                countryCode,
                isCurrentPosition: true,
                forecastSource: countryCode === 'US' ? 'nws' : 'open-meteo',
              });
            } catch {
              addFallbackLocation();
            }
          },
          error => {
            console.log('Geolocation error:', error.message);
            addFallbackLocation();
          },
          {enableHighAccuracy: false, timeout: 10000, maximumAge: 300000},
        );
      } catch {
        addFallbackLocation();
      }
    };

    requestAndFetch();
  }, [locations.length, triedGeolocation, addLocation]);
}
