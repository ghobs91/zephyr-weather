# Zephyr Weather — Development Guide

## Prerequisites

- Node.js ≥ 18 (`package.json` engines; the Xcode Cloud script installs Node 22; local development was observed on Node 26)
- npm
- CocoaPods (repo lockfile generated with 1.16.2) — `pod --version`
- Xcode (app target + WidgetKit extension); macOS required for Mac Catalyst
- Ruby + Bundler for Fastlane (`ios/Gemfile`)
- JDK + Android SDK only if working on `android/`

## Installation

```bash
npm install
npm run pod-install        # cd ios && pod install
```

`ios/Pods/` is tracked in git — the pod churn after `pod install` is committed, not discarded.

## Running locally

```bash
npm start                  # Metro bundler
npm run ios                # iOS simulator build & run
```

macOS (Catalyst):

```bash
npx react-native run-ios --scheme ZephyrWeather --destination "platform=macOS,variant=Mac Catalyst"
```

Or open `ios/ZephyrWeather.xcworkspace` in Xcode (see `MACOS_SETUP.md` for details).

## Testing

- **Runner**: Jest via `npm test`; the `react-native` preset is configured in `jest.config.js`, and `jest.setup.js` registers the AsyncStorage in-memory mock. Tests are colocated in `__tests__` under `src/components`, `src/services`, `src/theme`, `src/utils`.
- **Targeted**: `npm test -- <pattern>` (e.g. `npm test -- preferredWeatherService`).
- **Current status (2026-08-20)**: all green — 5 suites, 12/12 passing. The widget source test asserts on `ios/ZephyrWeatherWidgets/CurrentWeatherWidget.swift`; update it when changing the widget layout.

## Lint, format, type check

- **Lint**: `npm run lint` — ESLint 9 flat config in `eslint.config.js` (FlatCompat wrapper around `@react-native/eslint-config`; `react-native/no-inline-styles` and `react/react-in-jsx-scope` disabled). The command runs, but exits non-zero with 48 errors / 7 warnings of pre-existing debt (mostly `@typescript-eslint/no-unused-vars`).
- **Format**: `npx prettier --write <file>` — config in `.prettierrc.js` (`singleQuote`, `trailingComma: all`, `bracketSpacing: false`, `arrowParens: always`, `bracketSameLine: true`).
- **Types**: `npx tsc --noEmit` — clean. Note: `StyleSheet.absoluteFillObject` was removed in RN 0.86; use `absoluteFill`.

## Widget development

Widget work spans three layers:

1. **TypeScript** — `src/utils/widgetManager.ts`: serializes weather/locations and writes to the App Group; coalesces `WidgetKit` reloads (1500 ms cooldown). Test hooks: `__widgetManagerTestUtils.resetReloadScheduler()`.
2. **Objective-C bridge** — `ios/ZephyrWeather/ZephyrWidgetBridge.m`: `setItem(key, value, appGroup)` and `reloadWidgets()`.
3. **Swift extension** — `ios/ZephyrWeatherWidgets/`: WidgetKit views reading `weatherData` and `locations` from App Group `group.com.zephyrweather.shared`.

Native bridge/extension changes require an Xcode rebuild. `ZephyrReloadAllWidgets()` is exposed via `@_cdecl` to avoid ObjC/Swift header-generation ordering problems.

Before widget work, check the Serena diagnostic memory at `.serena/memories/widget-diagnostics/findings.md` (10 ranked widget issues).

## Build & release

- **EAS** (`eas.json`): `eas build --profile production` (App Store) and `--profile development` (internal dev client); a `submit.production` profile exists. EAS project id lives in `app.json` → `expo.extra.eas.projectId`; `appVersionSource: local`.
- **Xcode Cloud**: configured in Apple's web console; the repo-side hook is `ios/ci_scripts/ci_post_clone.sh` (installs Node, npm deps, pods, generates Expo module stubs).
- **Fastlane** (`fastlane/Fastfile`): `cd ios && bundle exec fastlane beta` builds and uploads to TestFlight; `fastlane release` builds and uploads for App Store review. Auth is via App Store Connect API key (`Appfile`: `apple_id` intentionally empty, `team_id` set).
- **Versioning**: version `1.6.1` and build number `8` live in `app.json`; Fastlane bumps build numbers per upload; `eas.json` has `autoIncrement: true`.

## Debugging & log locations

- JS logs: Metro console.
- Bridge logs: `NSLog` with `[ZephyrWidgetBridge]` prefix in the Xcode console.
- Swift widget logs: Xcode console for the widget extension scheme.
- Build artifacts: `build.log` and `xcodebuild_output.log` in the repo root (untracked; do not commit).

## Common failure modes

- **Pod build issues**: the Podfile is non-standard for Expo SDK 57 interop — static frameworks, iOS 16.4 floor, header search path fixes for `Expo`, and an `#ifndef` patch of `fmt/base.h`. Do not "simplify" it without understanding those fixes.
- **ESLint**: flat config is in place; remaining failures are pre-existing lint debt, not config errors.
- **RN 0.86 type changes**: `StyleSheet.absoluteFillObject` no longer exists (use `absoluteFill`).
- **Jest setup**: `@react-native/jest-preset` is a peer dependency of RN 0.86 — it must be installed explicitly (it is, as a devDependency), and `jest.setup.js` must register the AsyncStorage mock.
- **`ios/Pods` churn**: expected in `git status` after `pod install`; it is committed by design.

## Pre-commit checklist

1. `npx tsc --noEmit` — no new errors.
2. `npm test` — no new failures (known failures: see Testing).
3. `npx prettier --write <changed files>`.
4. If widget files changed, verify the widget renders (Xcode/simulator).
