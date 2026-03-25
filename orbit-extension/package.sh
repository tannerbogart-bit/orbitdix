#!/usr/bin/env bash
# Packages the extension into a zip ready for Chrome Web Store submission
# Run from the repo root: bash orbit-extension/package.sh

set -e

VERSION=$(node -p "require('./orbit-extension/manifest.json').version")
OUT="orbit-extension-v${VERSION}.zip"

cd orbit-extension
zip -r "../${OUT}" \
  manifest.json \
  background.js \
  content.js \
  popup.js \
  popup.html \
  styles.css \
  icons/

echo "✓ Packaged: ${OUT}"
echo ""
echo "Next steps:"
echo "  1. Go to https://chrome.google.com/webstore/devconsole"
echo "  2. Click 'New item' and upload ${OUT}"
echo "  3. Fill in store listing (title, description, screenshots)"
echo "  4. Submit for review (~1-3 business days)"
echo "  5. After approval, copy the Extension ID from the dashboard"
echo "     and add it to your Railway env vars as CHROME_EXTENSION_ID"
