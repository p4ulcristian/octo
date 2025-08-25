#!/bin/bash

# CEF OAuth App Build Script
# Supports macOS, Linux, and Windows (via WSL/MSYS2)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
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
else
    print_error "Unsupported platform: $OSTYPE"
    exit 1
fi

print_status "Building CEF OAuth App for $PLATFORM"

# Check prerequisites
command -v cmake >/dev/null 2>&1 || {
    print_error "CMake is required but not installed. Please install CMake 3.19 or later."
    exit 1
}

# Check CMake version
CMAKE_VERSION=$(cmake --version | head -n1 | cut -d' ' -f3)
print_status "Using CMake version: $CMAKE_VERSION"

# Create and enter build directory
BUILD_DIR="build"
if [ ! -d "$BUILD_DIR" ]; then
    print_status "Creating build directory..."
    mkdir "$BUILD_DIR"
fi

cd "$BUILD_DIR"

# Platform-specific CMake configuration
print_status "Configuring build system..."

case $PLATFORM in
    "macos")
        CC=/usr/bin/clang CXX=/usr/bin/clang++ cmake .. -G "Unix Makefiles" \
            -DCMAKE_BUILD_TYPE=Release \
            -DCMAKE_OSX_DEPLOYMENT_TARGET=10.15 \
            -DCMAKE_C_COMPILER=/usr/bin/clang \
            -DCMAKE_CXX_COMPILER=/usr/bin/clang++
        ;;
    "linux")
        cmake .. -G "Unix Makefiles" \
            -DCMAKE_BUILD_TYPE=Release
        ;;
    "windows")
        cmake .. -G "Visual Studio 16 2019" -A x64 \
            -DCMAKE_BUILD_TYPE=Release
        ;;
esac

if [ $? -ne 0 ]; then
    print_error "CMake configuration failed!"
    exit 1
fi

print_status "Configuration completed successfully"

# Build the project
print_status "Building the application..."

case $PLATFORM in
    "macos"|"linux")
        cmake --build . --config Release --parallel
        ;;
    "windows")
        cmake --build . --config Release
        ;;
esac

if [ $? -ne 0 ]; then
    print_error "Build failed!"
    exit 1
fi

print_status "Build completed successfully!"

# Show output location
case $PLATFORM in
    "macos")
        APP_PATH="./Release/cef_oauth_app.app"
        if [ -d "$APP_PATH" ]; then
            print_status "Application built: $APP_PATH"
            print_status "To run: open $APP_PATH"
        fi
        ;;
    "linux")
        APP_PATH="./cef_oauth_app"
        if [ -f "$APP_PATH" ]; then
            print_status "Application built: $APP_PATH"
            print_status "To run: $APP_PATH"
        fi
        ;;
    "windows")
        APP_PATH="./Release/cef_oauth_app.exe"
        if [ -f "$APP_PATH" ]; then
            print_status "Application built: $APP_PATH"
            print_status "To run: $APP_PATH"
        fi
        ;;
esac

# Check for CEF binaries
CEF_DIR="./cef"
if [ -d "$CEF_DIR" ]; then
    print_status "CEF binaries downloaded to: $CEF_DIR"
else
    print_warning "CEF binaries directory not found. Build may be incomplete."
fi

print_status "Build process completed!"
print_status "Check the README.md for usage instructions."