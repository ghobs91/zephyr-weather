#!/bin/sh
set -e

# Xcode Cloud post-clone script for React Native / Expo projects.
# Runs after cloning the repository and before resolving package dependencies
# and building. Required because node_modules/ is gitignored but source files
# inside it are referenced by the Yoga pod and other CocoaPods targets.

echo "ci_post_clone.sh: Installing npm dependencies..."

cd "$CI_PRIMARY_REPOSITORY_PATH"

# Install dependencies (prefer npm ci for reproducible builds in CI)
if [ -f "package-lock.json" ]; then
  npm ci
else
  npm install
fi

echo "ci_post_clone.sh: npm install complete."
