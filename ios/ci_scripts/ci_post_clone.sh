#!/bin/sh
set -e

echo "=== ci_post_clone.sh: Starting ==="

# ------------------------------------------------------------------
# 1. Install Node.js
#    Xcode Cloud macOS runners do not include Node.js by default.
# ------------------------------------------------------------------
echo "--- Installing Node.js ---"
if ! command -v node >/dev/null 2>&1; then
  brew install node@22 2>/dev/null || brew install node 2>/dev/null
fi

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Failed to install Node.js"
  exit 1
fi

node --version
npm --version

# ------------------------------------------------------------------
# 2. Install npm dependencies
#    97 source file references in the Pods project + 8 build phase
#    scripts point into node_modules/ — those targets can't compile
#    without it. The Podfile also loads Ruby helpers from here.
# ------------------------------------------------------------------
echo "--- Installing npm dependencies ---"
cd "$CI_PRIMARY_REPOSITORY_PATH"
npm ci

# ------------------------------------------------------------------
# 3. Run CocoaPods install
#    The committed ios/Pods/ cannot be reused on CI as-is:
#    - 80+ files under Target Support Files/ contain hardcoded local
#      paths (/Users/andrewg/...) that don't exist on CI.
#    - Pods/sentry-xcframeworks/*/Sentry.xcframework is a symlink to
#      ~/Library/Caches on the machine that ran pod install — it dangles
#      on CI, which breaks RNSentry with 'Sentry/Sentry.h' file not found.
#    - The ExpoModulesJSI build phase resolves JSI headers via PODS_ROOT;
#      stale paths make its nested xcodebuild fail the archive.
#    A fresh pod install regenerates every xcconfig, build script, and
#    support file with CI-appropriate absolute paths, re-downloads the
#    Sentry xcframework into the CI cache, and re-stages the symlink.
#
#    Note: the Podfile loads Ruby helpers from node_modules/ (lines
#    1-2), which is why npm ci must run before this step.
#    Note: xcodeproj 1.28.1 supports objectVersion 70 (see
#    COMPATIBILITY_VERSION_BY_OBJECT_VERSION), so no pbxproj downgrade
#    is needed — just make sure a recent CocoaPods is used.
# ------------------------------------------------------------------
echo "--- Installing CocoaPods ---"
if ! command -v pod >/dev/null 2>&1; then
  echo "CocoaPods not found, installing 1.16.2..."
  sudo gem install cocoapods -v 1.16.2 --no-document 2>/dev/null \
    || gem install cocoapods -v 1.16.2 --no-document
fi

if ! command -v pod >/dev/null 2>&1; then
  echo "ERROR: Failed to install CocoaPods"
  exit 1
fi

pod --version

echo "--- Running pod install ---"
cd "$CI_PRIMARY_REPOSITORY_PATH/ios"
pod install

echo "=== ci_post_clone.sh: Complete ==="
