# Zephyr Weather — Agent Guide

## What this repository is

Zephyr Weather is a client-only weather app for iOS (iPhone/iPad), macOS (Mac Catalyst), and native WidgetKit widgets (Home Screen + Notification Center). No backend, no accounts — weather data comes from public, keyless APIs. The React Native app pushes weather data to the widgets through a shared App Group via an Objective-C bridge module.

## Tech stack

- React Native 0.86.2, React 19.2.3, Expo SDK 57 (`expo ~57.0.10`)
- TypeScript 5.7.3 (strict)
- Zustand 5 + AsyncStorage persistence
- React Navigation 7 (native stack + bottom tabs)
- Reanimated 4.5.1 + react-native-worklets
- Jest 29, ESLint 9, Prettier 3.5.3
- iOS native: Objective-C bridge (`ZephyrWidgetBridge`), Swift WidgetKit extension
- Weather APIs: Open-Meteo (primary), NWS (US), Met Norway, Bright Sky, NEXRAD radar — all keyless

## Repository layout

```
index.js                    # RN entry point — registers src/App with an error boundary
app.json                    # Expo config (name, version 1.6.1, bundle id, EAS projectId)
eas.json                    # EAS build/submit profiles
babel.config.js             # reanimated plugin + @/* module resolver
metro.config.js             # react-native-svg-transformer setup
tsconfig.json               # strict; @/* → src/*; extends @react-native/typescript-config
eslint.config.js            # ESLint 9 flat config (wraps @react-native/eslint-config via FlatCompat)
jest.config.js              # react-native preset + jest.setup.js
jest.setup.js               # registers the AsyncStorage in-memory jest mock
src/
  App.tsx                   # root: theme, NavigationContainer, RootNavigator
  navigation/RootNavigator.tsx  # stack (MainTabs, DailyDetail, SearchLocation, Alerts,
                                #  Locations, Settings) + tabs (Home, Radar, custom glass bar)
  screens/                  # HomeScreen, MacOSHomeScreen (Catalyst), RadarScreen, DailyDetailScreen,
                            #  AlertsScreen, LocationsScreen, SearchLocationScreen, SettingsScreen
  components/               # weather cards + GlassSurface design-system primitives
  store/weatherStore.ts     # Zustand: locations, settings, weather; persisted to AsyncStorage
  services/                 # per-provider fetchers + preferredWeatherService dispatcher + weatherCache
  hooks/                    # useThemeColors, useWeatherRefresh, formatters, etc.
  theme/design.ts           # design tokens: getThemeColors, withAlpha, glass/card styles
  utils/widgetManager.ts    # writes weather to the App Group + reloads WidgetKit
  types/                    # weather.ts, settings.ts
ios/
  ZephyrWeather/            # app target (ObjC bridge: ZephyrWidgetBridge.m)
  ZephyrWeatherWidgets/     # WidgetKit extension (Swift)
  Podfile                   # Expo autolinking, static frameworks, fmt patch (see Known Unknowns)
  Pods/                     # TRACKED IN GIT — commit pod install results
  ci_scripts/ci_post_clone.sh  # Xcode Cloud build script
fastlane/                   # Fastfile lanes: beta (TestFlight), release (App Store)
scripts/generate-icons.sh   # icon asset generation
```

## Commands

All commands run from the repo root. `standard` means defined in `package.json`/project docs but not run during context bootstrap.

| Command                                                                                               | Purpose                                  | Verified status (2026-08-20)                                                     |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------- |
| `npm install`                                                                                         | install JS dependencies                  | standard                                                                         |
| `npm run pod-install`                                                                                 | `cd ios && pod install`                  | standard                                                                         |
| `npm start`                                                                                           | start Metro bundler                      | standard                                                                         |
| `npm run ios`                                                                                         | build & run on iOS simulator             | standard                                                                         |
| `npm run android`                                                                                     | build & run Android (see Known Unknowns) | standard                                                                         |
| `npm test`                                                                                            | Jest (colocated `__tests__`)             | **passes** — 5 suites, 12/12                                                     |
| `npm run lint`                                                                                        | ESLint                                   | **runs** — 48 errors / 7 warnings remain (pre-existing debt; see Known Unknowns) |
| `npx tsc --noEmit`                                                                                    | type check                               | **passes** (clean)                                                               |
| `npx prettier --write <file>`                                                                         | formatting (config in `.prettierrc.js`)  | standard                                                                         |
| `npx react-native run-ios --scheme ZephyrWeather --destination "platform=macOS,variant=Mac Catalyst"` | run macOS Catalyst build                 | from `MACOS_SETUP.md`, not verified                                              |
| `eas build --profile production`                                                                      | EAS cloud build (profiles in `eas.json`) | not verified                                                                     |
| `cd ios && bundle exec fastlane beta`                                                                 | build + upload to TestFlight             | not verified                                                                     |

## Development workflow

1. **Inspect** — read the relevant code first. Widget work spans three layers: TS (`src/utils/widgetManager.ts`), ObjC bridge (`ios/ZephyrWeather/ZephyrWidgetBridge.m`), and Swift (`ios/ZephyrWeatherWidgets/`).
2. **Plan** — identify the smallest change that satisfies the request.
3. **Implement minimally** — use existing design tokens (`src/theme/design.ts`) instead of raw colors; follow Prettier config.
4. **Verify** — `npx tsc --noEmit`, then `npm test -- <pattern>` for the affected area, then `npm test`, then `npm run lint`.
5. **Report** — state what you ran, what passed, and what failed.

## Conventions

- **Styling**: glassmorphism design system in `src/theme/design.ts` (`getThemeColors`, `withAlpha`, `getGlassPillStyle`, `GlassSurface` component). Use tokens, not raw hex/rgba literals.
- **Paths**: `@/*` aliases to `src/*` (configured in both `tsconfig.json` and `babel.config.js`).
- **Formatting**: Prettier — `singleQuote`, `trailingComma: 'all'`, `bracketSpacing: false`, `arrowParens: 'always'`, `bracketSameLine: true`.
- **ESLint**: flat config in `eslint.config.js` (FlatCompat wrapper around `@react-native/eslint-config`); `react-native/no-inline-styles` and `react/react-in-jsx-scope` disabled. `npm run lint` runs but reports pre-existing debt (see Known Unknowns).
- **Widget data contract**: App Group `group.com.zephyrweather.shared`; keys `weatherData` and `locations`. Writes go through the `ZephyrWidgetBridge` native module; widget reloads are coalesced (1500 ms cooldown) to respect the WidgetKit reload budget.
- **`ios/Pods/` is tracked**: `pod install` churn is committed deliberately (confirmed by git history). Do not "clean it up" or add it to `.gitignore`.
- **Commits**: Conventional Commits with scopes, e.g. `feat(widget): …`, `fix: …` (see `git log`). One concern per commit.
- **Do not commit**: `build/` (DerivedData), `.DS_Store`, `.serena/` (agent tooling), `build.log`, `xcodebuild_output.log`. These are untracked/noisy and not currently ignored.

## Testing

- Jest + babel-jest via the `react-native` preset (`jest.config.js`); `jest.setup.js` registers the AsyncStorage in-memory mock. Tests are colocated in `__tests__` under `src/components`, `src/services`, `src/theme`, `src/utils`.
- Run `npm test` before finishing a change — currently 5 suites, 12/12 passing.
- Widget scheduler logic exposes test hooks (`__widgetManagerTestUtils.resetReloadScheduler` in `src/utils/widgetManager.ts`).
- `currentWeatherWidgetSource.test.js` asserts on the Swift widget source (`ios/ZephyrWeatherWidgets/CurrentWeatherWidget.swift`) — update it when changing the widget layout.

## Environment & secrets

- No environment variables are read by application code; there are no `.env*` files and intentionally no `.env.example`.
- Fastlane authenticates with an App Store Connect API key (`fastlane/Appfile` — `apple_id` intentionally empty). Never add credentials, keys, or tokens to the repository.

## Git & PR rules

- Single `main` branch. Remotes: `origin` (github.com/ghobs91/zephyr-weather) and `rad` (Radicle).
- No PR templates, branch rules, or CI YAML in the repo. CI is Xcode Cloud (configuration lives in Apple's console; the repo-side hook is `ios/ci_scripts/ci_post_clone.sh`) plus EAS.

## Safety constraints

- Do not invent APIs, files, test results, environment variables, or deployment behavior.
- Do not modify generated files unless the project explicitly expects it (it _does_ expect `ios/Pods/` and `ios/build/generated/` updates).
- Do not access production systems or perform destructive operations without explicit user approval.
- Do not report tests as passing unless they were run.

## Tool usage policy

- Read local code before consulting external documentation.
- Use documentation tools only for unfamiliar third-party APIs (Expo, React Native version specifics).
- Use device/simulator tooling only for user-facing changes.

## Known Unknowns

- **Lint debt**: `npm run lint` runs (flat config migrated) but exits non-zero — 48 errors / 7 warnings remain across `src/` (mostly `@typescript-eslint/no-unused-vars`). Not yet cleaned up.
- **Android** target exists (`android/app/`, `npm run android`) but shows no recent activity; buildability is unverified.
- **iOS deployment targets**: `ios/Podfile` sets platform 16.4; `project.pbxproj` contains both 16.4 and 17.0 — which target maps to which is unverified.
- **Notifications**: `README.md` lists weather-alert/precipitation notifications as features, but only settings toggles exist in code — no notification implementation was found.
- **`@react-native-community/cli` devDeps** remain pinned to 20.1.0 while the rest of the RN stack moved to 0.86.2; `npm run ios` / `npm run android` behavior with this CLI is unverified.
- **`.serena/`** (Serena MCP tooling) contains a diagnostic memory at `.serena/memories/widget-diagnostics/findings.md` (10 ranked widget issues). Consult it before widget work.
