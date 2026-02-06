#!/bin/bash

# App Icon Generator Script for Tempest Weather
# This script requires ImageMagick to be installed
# Install via: brew install imagemagick

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo -e "${RED}Error: ImageMagick is not installed${NC}"
    echo "Install it with: brew install imagemagick"
    exit 1
fi

# Check if source icon exists
if [ ! -f "$1" ]; then
    echo -e "${RED}Error: Source icon file not found${NC}"
    echo "Usage: ./scripts/generate-icons.sh <path-to-1024x1024-icon.png>"
    exit 1
fi

SOURCE_ICON="$1"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${GREEN}Generating iOS icons...${NC}"

# iOS Icons
IOS_DIR="$PROJECT_ROOT/ios/TempestWeather/Images.xcassets/AppIcon.appiconset"

convert "$SOURCE_ICON" -resize 20x20 "$IOS_DIR/Icon-App-20x20@1x.png"
convert "$SOURCE_ICON" -resize 40x40 "$IOS_DIR/Icon-App-20x20@2x.png"
convert "$SOURCE_ICON" -resize 60x60 "$IOS_DIR/Icon-App-20x20@3x.png"
convert "$SOURCE_ICON" -resize 29x29 "$IOS_DIR/Icon-App-29x29@1x.png"
convert "$SOURCE_ICON" -resize 58x58 "$IOS_DIR/Icon-App-29x29@2x.png"
convert "$SOURCE_ICON" -resize 87x87 "$IOS_DIR/Icon-App-29x29@3x.png"
convert "$SOURCE_ICON" -resize 80x80 "$IOS_DIR/Icon-App-40x40@2x.png"
convert "$SOURCE_ICON" -resize 120x120 "$IOS_DIR/Icon-App-40x40@3x.png"
convert "$SOURCE_ICON" -resize 120x120 "$IOS_DIR/Icon-App-60x60@2x.png"
convert "$SOURCE_ICON" -resize 180x180 "$IOS_DIR/Icon-App-60x60@3x.png"
convert "$SOURCE_ICON" -resize 1024x1024 "$IOS_DIR/Icon-App-1024x1024@1x.png"

echo -e "${GREEN}✓ iOS icons generated${NC}"

echo -e "${GREEN}Generating Android icons...${NC}"

# Android Icons
ANDROID_RES="$PROJECT_ROOT/android/app/src/main/res"

# mipmap-mdpi (48x48)
convert "$SOURCE_ICON" -resize 48x48 "$ANDROID_RES/mipmap-mdpi/ic_launcher.png"
convert "$SOURCE_ICON" -resize 48x48 "$ANDROID_RES/mipmap-mdpi/ic_launcher_round.png"

# mipmap-hdpi (72x72)
convert "$SOURCE_ICON" -resize 72x72 "$ANDROID_RES/mipmap-hdpi/ic_launcher.png"
convert "$SOURCE_ICON" -resize 72x72 "$ANDROID_RES/mipmap-hdpi/ic_launcher_round.png"

# mipmap-xhdpi (96x96)
convert "$SOURCE_ICON" -resize 96x96 "$ANDROID_RES/mipmap-xhdpi/ic_launcher.png"
convert "$SOURCE_ICON" -resize 96x96 "$ANDROID_RES/mipmap-xhdpi/ic_launcher_round.png"

# mipmap-xxhdpi (144x144)
convert "$SOURCE_ICON" -resize 144x144 "$ANDROID_RES/mipmap-xxhdpi/ic_launcher.png"
convert "$SOURCE_ICON" -resize 144x144 "$ANDROID_RES/mipmap-xxhdpi/ic_launcher_round.png"

# mipmap-xxxhdpi (192x192)
convert "$SOURCE_ICON" -resize 192x192 "$ANDROID_RES/mipmap-xxxhdpi/ic_launcher.png"
convert "$SOURCE_ICON" -resize 192x192 "$ANDROID_RES/mipmap-xxxhdpi/ic_launcher_round.png"

echo -e "${GREEN}✓ Android icons generated${NC}"

echo ""
echo -e "${GREEN}✨ All icons generated successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Run: cd ios && pod install && cd .."
echo "2. Clean build: npm run ios (for iOS) or npm run android (for Android)"
echo ""
