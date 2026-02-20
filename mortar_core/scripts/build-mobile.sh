#!/bin/bash
# Build script: copies web assets into www/ for Capacitor
# Run from mortar_core directory: ./scripts/build-mobile.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
WWW_DIR="$PROJECT_DIR/www"

echo "🔧 Building mobile assets into www/..."

rm -rf "$WWW_DIR"
mkdir -p "$WWW_DIR/ui_js"

# Core web app files
cp "$PROJECT_DIR/index.html" "$WWW_DIR/index.html"
cp "$PROJECT_DIR/BallisticCalculator.js" "$WWW_DIR/"
cp "$PROJECT_DIR/ballistic-data.json" "$WWW_DIR/"

# UI modules
cp "$PROJECT_DIR/ui_js/"*.js "$WWW_DIR/ui_js/"

# Static assets
cp "$PROJECT_DIR/icon.png" "$WWW_DIR/" 2>/dev/null || true
cp "$PROJECT_DIR/arma-reforger-logo.png" "$WWW_DIR/" 2>/dev/null || true
cp "$PROJECT_DIR/FIST_Discord.webp" "$WWW_DIR/" 2>/dev/null || true

# Mobile-specific CSS override
cp "$PROJECT_DIR/mobile.css" "$WWW_DIR/" 2>/dev/null || true

# Patch index.html for mobile: inject mobile.css and viewport-fit=cover
sed -i '' 's|<meta name="viewport" content="width=device-width, initial-scale=1.0">|<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no, maximum-scale=1.0">|' "$WWW_DIR/index.html"

# Inject mobile.css link after theme-color meta tag
sed -i '' '/<meta name="theme-color"/a\
\    <link rel="stylesheet" href="mobile.css">' "$WWW_DIR/index.html"

echo "✅ www/ built successfully ($(find "$WWW_DIR" -type f | wc -l | tr -d ' ') files)"
echo ""
echo "Next: npx cap sync"
