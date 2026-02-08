# Zephyr Weather

A beautiful, feature-rich weather app for iOS built with React Native, inspired by [Breezy Weather](https://github.com/breezy-weather/breezy-weather).

![React Native](https://img.shields.io/badge/React%20Native-0.73-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

### Weather Data
- **Current Conditions**: Temperature, feels like, weather description, and live updates
- **Hourly Forecast**: 24-hour temperature and precipitation forecast with interactive scroll
- **Daily Forecast**: 7-day extended forecast with high/low temperatures
- **Weather Alerts**: Severe weather warnings with severity levels
- **Air Quality Index**: Real-time AQI with component breakdown (PM2.5, PM10, O3, NO2, SO2, CO)
- **Pollen Levels**: Grass, tree, ragweed, and mold counts
- **UV Index**: Daily UV levels with risk assessment

### Weather Details
- **Wind**: Speed, gusts, and direction
- **Precipitation**: Probability, total amount, and type
- **Humidity**: Relative humidity and dew point
- **Pressure**: Atmospheric pressure
- **Visibility**: Current visibility distance
- **Sun & Moon**: Sunrise, sunset, moonrise, moonset, and moon phase

### Locations
- **Multiple Locations**: Save and manage multiple locations
- **Current Location**: Automatic GPS-based weather
- **Location Search**: Search cities worldwide using Open-Meteo geocoding

### Customization
- **Theme**: Light, dark, or system automatic
- **Units**: 
  - Temperature: Celsius / Fahrenheit
  - Wind: km/h / mph / m/s / knots
  - Pressure: hPa / inHg / mmHg
  - Precipitation: mm / inches
  - Distance: km / miles

### Notifications
- Weather alerts
- Precipitation notifications
- Daily forecast notifications
- Tomorrow's forecast preview

## Weather Sources

Currently integrated with **[Open-Meteo](https://open-meteo.com/)** - a free, open-source weather API.

### Open-Meteo Features
- Weather forecast
- Current conditions
- Air quality data
- Pollen data
- Geocoding search
- No API key required

## Architecture

```
src/
├── App.tsx                     # Root component
├── types/
│   ├── weather.ts              # Weather data types
│   └── settings.ts             # Settings types
├── store/
│   └── weatherStore.ts         # Zustand state management
├── services/
│   └── openMeteoService.ts     # Open-Meteo API integration
├── navigation/
│   └── RootNavigator.tsx       # React Navigation setup
├── screens/
│   ├── HomeScreen.tsx          # Main weather display
│   ├── LocationsScreen.tsx     # Location management
│   ├── SettingsScreen.tsx      # App settings
│   ├── SearchLocationScreen.tsx # Location search
│   ├── DailyDetailScreen.tsx   # Detailed daily view
│   └── AlertsScreen.tsx        # Weather alerts
├── components/
│   ├── CurrentWeatherCard.tsx  # Current conditions
│   ├── HourlyForecastCard.tsx  # Hourly scroll view
│   ├── DailyForecastCard.tsx   # Daily forecast list
│   ├── WeatherDetailCard.tsx   # Wind, humidity, etc.
│   ├── AirQualityCard.tsx      # AQI display
│   ├── PollenCard.tsx          # Pollen levels
│   ├── SunMoonCard.tsx         # Sun/moon times
│   └── AlertBanner.tsx         # Alert notification
└── theme/
    └── colors.ts               # Color system
```

## Getting Started

### Prerequisites

- Node.js 18+
- Xcode 15+ (for iOS development)
- CocoaPods

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/zephyr-weather.git
cd zephyr-weather
```

2. Install dependencies:
```bash
npm install
```

3. Install iOS pods:
```bash
cd ios && pod install && cd ..
```

4. Start the Metro bundler:
```bash
npm start
```

5. Build and run on iOS:
```bash
npm run ios
```

## Dependencies

### Core
- `react-native` - Cross-platform mobile framework
- `typescript` - Type safety

### State Management
- `zustand` - Lightweight state management
- `@react-native-async-storage/async-storage` - Persistent storage

### Navigation
- `@react-navigation/native` - Navigation container
- `@react-navigation/native-stack` - Native stack navigator
- `@react-navigation/bottom-tabs` - Tab navigation

### UI
- `react-native-vector-icons` - Icon library
- `react-native-safe-area-context` - Safe area handling
- `react-native-screens` - Native navigation screens
- `react-native-linear-gradient` - Gradient backgrounds
- `react-native-haptic-feedback` - Haptic feedback

### Utilities
- `date-fns` - Date formatting
- `axios` - HTTP client

### Location
- `@react-native-community/geolocation` - GPS access

## Roadmap

- [ ] Widget support
- [ ] Apple Watch companion app
- [ ] Additional weather sources (NWS, MET Norway, etc.)
- [ ] Weather maps (radar, satellite)
- [ ] Interactive charts
- [ ] Background refresh
- [ ] Siri shortcuts

## Credits

- Inspired by [Breezy Weather](https://github.com/breezy-weather/breezy-weather)
- Weather data by [Open-Meteo](https://open-meteo.com/) (CC BY 4.0)
- Icons by [Material Community Icons](https://materialdesignicons.com/)

## License

MIT License - see [LICENSE](LICENSE) for details.
