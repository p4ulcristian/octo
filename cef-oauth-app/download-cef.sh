#!/bin/bash

# CEF Download Script
# Downloads CEF binaries for the current platform

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Detect platform
PLATFORM=""
if [[ "$OSTYPE" == "darwin"* ]]; then
    PLATFORM="macos"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    PLATFORM="linux"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    PLATFORM="windows"
fi

print_status "Downloading CEF for $PLATFORM..."

# Latest CEF versions for 2025
case $PLATFORM in
    "macos")
        # Check if we're on Apple Silicon
        if [[ $(uname -m) == "arm64" ]]; then
            # Latest CEF 139 for macOS ARM64 (matches Chrome 139 stable)
            CEF_URL="https://cef-builds.spotifycdn.com/cef_binary_139.0.23+g34a5b51+chromium-139.0.7258.128_macosarm64.tar.bz2"
            CEF_FILENAME="cef_binary_139.0.23+g34a5b51+chromium-139.0.7258.128_macosarm64.tar.bz2"
        else
            CEF_URL="https://cef-builds.spotifycdn.com/cef_binary_131.3.3+g98e5a2a+chromium-131.0.6778.205_macosx64.tar.bz2"
            CEF_FILENAME="cef_binary_131.3.3+g98e5a2a+chromium-131.0.6778.205_macosx64.tar.bz2"
        fi
        ;;
    "linux")
        CEF_URL="https://cef-builds.spotifycdn.com/cef_binary_119.4.7+g55e15c8+chromium-119.0.6045.199_linux64_minimal.tar.bz2"
        CEF_FILENAME="cef_binary_119.4.7+g55e15c8+chromium-119.0.6045.199_linux64_minimal.tar.bz2"
        ;;
    "windows")
        CEF_URL="https://cef-builds.spotifycdn.com/cef_binary_119.4.7+g55e15c8+chromium-119.0.6045.199_windows64_minimal.tar.bz2"
        CEF_FILENAME="cef_binary_119.4.7+g55e15c8+chromium-119.0.6045.199_windows64_minimal.tar.bz2"
        ;;
    *)
        print_error "Unsupported platform: $OSTYPE"
        exit 1
        ;;
esac

# Create temp directory for download
TEMP_DIR="temp_cef_download"
mkdir -p "$TEMP_DIR"
cd "$TEMP_DIR"

print_status "Downloading from: $CEF_URL"

# Download CEF
if command -v wget >/dev/null 2>&1; then
    wget "$CEF_URL" -O "$CEF_FILENAME"
elif command -v curl >/dev/null 2>&1; then
    curl -L "$CEF_URL" -o "$CEF_FILENAME"
else
    print_error "Neither wget nor curl found. Please install one of them."
    exit 1
fi

if [ $? -ne 0 ]; then
    print_error "Download failed. The CEF version might not be available."
    print_warning "Please visit https://cef-builds.spotifycdn.com/index.html to find available versions."
    cd ..
    rm -rf "$TEMP_DIR"
    exit 1
fi

print_status "Download completed. Extracting..."

# Extract CEF
if command -v tar >/dev/null 2>&1; then
    tar -xjf "$CEF_FILENAME"
else
    print_error "tar command not found."
    exit 1
fi

# Find the extracted directory (it should be the only directory)
CEF_EXTRACTED_DIR=$(find . -maxdepth 1 -type d -name "cef_binary_*" | head -n 1)

if [ -z "$CEF_EXTRACTED_DIR" ]; then
    print_error "Could not find extracted CEF directory."
    cd ..
    rm -rf "$TEMP_DIR"
    exit 1
fi

print_status "Moving CEF to build directory..."

# Move to the expected location
cd ..
if [ -d "build/cef" ]; then
    print_warning "Removing existing CEF directory..."
    rm -rf "build/cef"
fi

mkdir -p build
mv "$TEMP_DIR/$CEF_EXTRACTED_DIR" "build/cef"

# Cleanup
rm -rf "$TEMP_DIR"

print_status "CEF binaries installed successfully!"
print_status "You can now run: ./build.sh"