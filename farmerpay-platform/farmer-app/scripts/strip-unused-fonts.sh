#!/bin/bash
# Strip unused icon font files from Expo web/native build output.
# Only keeps Ionicons (the only icon family used in the app).
# Run after: npx expo export --platform web --output-dir dist/
# Saves ~3.6 MB from the bundle.

BUILD_DIR="${1:-dist}"

if [ ! -d "$BUILD_DIR" ]; then
  echo "Usage: $0 <build-output-dir>"
  exit 1
fi

KEEP="Ionicons"

echo "Stripping unused icon fonts from $BUILD_DIR..."
echo "Keeping: $KEEP"

SAVED=0
COUNT=0

find "$BUILD_DIR" -name "*.ttf" -path "*/vector-icons/*" | while read font; do
  basename=$(basename "$font")
  if echo "$basename" | grep -q "$KEEP"; then
    echo "  KEEP: $basename"
  else
    size=$(stat -f%z "$font" 2>/dev/null || stat -c%s "$font" 2>/dev/null)
    echo "  DROP: $basename ($(( size / 1024 )) KB)"
    rm "$font"
    SAVED=$((SAVED + size))
    COUNT=$((COUNT + 1))
  fi
done

echo ""
echo "Done. Removed unused font files."
echo "New total size: $(du -sh "$BUILD_DIR" | cut -f1)"
