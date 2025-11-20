#!/bin/bash

# TabDog Chrome Extension Build Script
# This script creates a production-ready zip file for Chrome Web Store submission

set -e  # Exit on error

echo "🐕 Building TabDog extension for Chrome Web Store..."

# Define output filename
OUTPUT_FILE="tabdog-extension.zip"

# Remove old build if it exists
if [ -f "$OUTPUT_FILE" ]; then
    echo "📦 Removing old build..."
    rm "$OUTPUT_FILE"
fi

# Create zip file with only necessary files
echo "📦 Creating production bundle..."
zip -r "$OUTPUT_FILE" \
    manifest.json \
    icons/ \
    pages/ \
    src/ \
    -x "*.DS_Store" \
    -x "*/__pycache__/*" \
    -x "*.pyc" \
    -x "*/.git/*" \
    -x "*/node_modules/*" \
    -x "*/test*" \
    -x "*.test.js" \
    -x "*_test.js"

# Display success message
echo "✅ Build complete!"
echo "📦 Output: $OUTPUT_FILE"
echo ""
echo "📊 Package contents:"
unzip -l "$OUTPUT_FILE"
echo ""
echo "🚀 Next steps:"
echo "   1. Go to https://chrome.google.com/webstore/devconsole"
echo "   2. Click 'New Item' or update existing item"
echo "   3. Upload $OUTPUT_FILE"
echo "   4. Fill in store listing details"
echo "   5. Submit for review"
