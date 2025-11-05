#!/bin/bash

PACKAGES_DIR="./packages"

echo "Clearing release bundles from packages folder..."

if [ ! -d "$PACKAGES_DIR" ]; then
  echo "  ⚠️  Packages directory does not exist: $PACKAGES_DIR"
  exit 1
fi

# Count files before deletion
FILE_COUNT=$(find "$PACKAGES_DIR" -type f -name "*.zip" | wc -l | tr -d ' ')

if [ "$FILE_COUNT" -eq 0 ]; then
  echo "  ℹ️  No packages found in $PACKAGES_DIR"
  exit 0
fi

echo "  Found $FILE_COUNT package(s) to delete..."

# Delete all .zip files in packages directory
find "$PACKAGES_DIR" -type f -name "*.zip" -delete

if [ $? -eq 0 ]; then
  echo "  ✅ Successfully cleared $FILE_COUNT package(s)"
else
  echo "  ❌ Error clearing packages"
  exit 1
fi

echo "✅ Done"

