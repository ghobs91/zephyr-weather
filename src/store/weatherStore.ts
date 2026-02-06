import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Location, Weather} from '../types/weather';
import {AppSettings, defaultSettings} from '../types/settings';
import {updateWidgetData, updateAllLocationsWeatherData} from '../utils/widgetManager';

interface WeatherState {
  locations: Location[];
  currentLocationIndex: number;
  settings: AppSettings;
  isLoading: boolean;
  error: string | null;
  lastRefresh: Date | null;
  
  // Actions
  setLocations: (locations: Location[]) => void;
  addLocation: (location: Location) => void;
  removeLocation: (id: string) => void;
  updateLocation: (id: string, updates: Partial<Location>) => void;
  reorderLocations: (fromIndex: number, toIndex: number) => void;
  setCurrentLocationIndex: (index: number) => void;
  
  updateLocationWeather: (locationId: string, weather: Weather) => void;
  
  updateSettings: (settings: Partial<AppSettings>) => void;
  resetSettings: () => void;
  
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLastRefresh: (date: Date) => void;
  
  getCurrentLocation: () => Location | undefined;
}

export const useWeatherStore = create<WeatherState>()(
  persist(
    (set, get) => ({
      locations: [],
      currentLocationIndex: 0,
      settings: defaultSettings,
      isLoading: false,
      error: null,
      lastRefresh: null,
      
      setLocations: (locations) => {
        // Update all locations weather data for widgets
        const state = get();
        updateAllLocationsWeatherData(locations, state.settings).catch(err =>
          console.error('Failed to update all locations:', err)
        );
        set({locations});
      },
      
      addLocation: (location) => set((state) => {
        const newLocations = [...state.locations, location];
        // Update all locations list for widgets
        updateAllLocationsWeatherData(newLocations, state.settings).catch(err =>
          console.error('Failed to update all locations:', err)
        );
        return {locations: newLocations};
      }),
      
      removeLocation: (id) => set((state) => {
        const newLocations = state.locations.filter((l) => l.id !== id);
        // Update all locations list for widgets
        updateAllLocationsWeatherData(newLocations, state.settings).catch(err =>
          console.error('Failed to update all locations:', err)
        );
        return {
          locations: newLocations,
          currentLocationIndex: Math.min(
            state.currentLocationIndex,
            Math.max(0, newLocations.length - 1)
          ),
        };
      }),
      
      updateLocation: (id, updates) => set((state) => {
        const newLocations = state.locations.map((l) =>
          l.id === id ? {...l, ...updates} : l
        );
        // Update all locations weather data for widgets
        updateAllLocationsWeatherData(newLocations, state.settings).catch(err =>
          console.error('Failed to update all locations:', err)
        );
        return {locations: newLocations};
      }),
      
      reorderLocations: (fromIndex, toIndex) => set((state) => {
        const newLocations = [...state.locations];
        const [removed] = newLocations.splice(fromIndex, 1);
        newLocations.splice(toIndex, 0, removed);
        // Update all locations list for widgets
        updateAllLocationsWeatherData(newLocations, state.settings).catch(err =>
          console.error('Failed to update all locations:', err)
        );
        return {locations: newLocations};
      }),
      
      setCurrentLocationIndex: (index) => set((state) => {
        const newLocation = state.locations[index];
        if (newLocation?.weather) {
          updateWidgetData(newLocation, state.settings).catch(err =>
            console.error('Failed to update widget:', err)
          );
        }
        return {currentLocationIndex: index};
      }),
      
      updateLocationWeather: (locationId, weather) => set((state) => {
        const updatedLocations = state.locations.map((l) =>
          l.id === locationId ? {...l, weather} : l
        );
        
        // Update all locations weather data for widgets
        updateAllLocationsWeatherData(updatedLocations, state.settings).catch(err => 
          console.error('Failed to update all locations:', err)
        );
        
        return {
          locations: updatedLocations,
          lastRefresh: new Date(),
        };
      }),
      
      updateSettings: (updates) => set((state) => {
        const newSettings = {...state.settings, ...updates};
        
        // Update all locations weather data with new settings
        updateAllLocationsWeatherData(state.locations, newSettings).catch(err => 
          console.error('Failed to update all locations:', err)
        );
        
        return {settings: newSettings};
      }),
      
      resetSettings: () => set((state) => {
        // Update all locations weather data with default settings
        updateAllLocationsWeatherData(state.locations, defaultSettings).catch(err => 
          console.error('Failed to update all locations:', err)
        );
        return {settings: defaultSettings};
      }),
      
      setLoading: (loading) => set({isLoading: loading}),
      
      setError: (error) => set({error}),
      
      setLastRefresh: (date) => set({lastRefresh: date}),
      
      getCurrentLocation: () => {
        const state = get();
        return state.locations[state.currentLocationIndex];
      },
    }),
    {
      name: 'tempest-weather-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        locations: state.locations.map((l) => ({...l, weather: undefined})),
        settings: state.settings,
        currentLocationIndex: state.currentLocationIndex,
      }),
    }
  )
);
