cmake_minimum_required(VERSION 3.19)

project(cef_oauth_app)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(POLICY CMP0135)
  cmake_policy(SET CMP0135 NEW)
endif()

set(CEF_ROOT "${CMAKE_CURRENT_BINARY_DIR}/cef")
set(CMAKE_MODULE_PATH ${CMAKE_MODULE_PATH} "${CEF_ROOT}/cmake")

# Platform-specific settings
if(WIN32)
    set(CEF_PLATFORM "windows64")
    set(CEF_DISTRIBUTION_URL "https://cef-builds.spotifycdn.com/cef_binary_116.0.5845.190_windows64.tar.bz2")
elseif(APPLE)
    set(CEF_PLATFORM "macosarm64")
    set(CEF_DISTRIBUTION_URL "https://github.com/chromiumembedded/cef/releases/download/120.1.10%2Bg3ce3184%2Bchromium-120.0.6099.129/cef_binary_120.1.10+g3ce3184+chromium-120.0.6099.129_macosarm64.tar.bz2")
else()
    set(CEF_PLATFORM "linux64")
    set(CEF_DISTRIBUTION_URL "https://cef-builds.spotifycdn.com/cef_binary_116.0.5845.190_linux64.tar.bz2")
endif()

# Check if CEF is manually provided
if(NOT EXISTS "${CEF_ROOT}")
    message(STATUS "CEF binaries not found at ${CEF_ROOT}")
    message(STATUS "Please download CEF binaries manually:")
    message(STATUS "1. Visit: https://cef-builds.spotifycdn.com/index.html")
    message(STATUS "2. Download the latest stable build for ${CEF_PLATFORM}")
    message(STATUS "3. Extract to: ${CEF_ROOT}")
    message(STATUS "4. Re-run CMake")
    message(FATAL_ERROR "CEF binaries required to continue")
endif()

# CEF configuration
find_package(CEF REQUIRED)

# Add the CEF DLL wrapper
add_subdirectory(${CEF_ROOT}/libcef_dll libcef_dll_wrapper)

# Source files
set(SOURCES
    src/main.cpp
    src/app.cpp
    src/app.h
    src/client.cpp
    src/client.h
    src/oauth_handler.cpp
    src/oauth_handler.h
    src/main_handler.cpp
    src/main_handler.h
    src/simple_browser_window.cpp
    src/browser_window.h
)

# Determine the target output directory
SET_CEF_TARGET_OUT_DIR()

# Create the executable target
set(CEF_TARGET "cef_oauth_app")
add_executable(${CEF_TARGET} WIN32 MACOSX_BUNDLE ${SOURCES})
SET_EXECUTABLE_TARGET_PROPERTIES(${CEF_TARGET})
add_dependencies(${CEF_TARGET} libcef_dll_wrapper)
target_link_libraries(${CEF_TARGET} libcef_dll_wrapper ${CEF_STANDARD_LIBS})

# Windows-specific settings
if(WIN32)
    if(USE_SANDBOX)
        target_link_libraries(${CEF_TARGET} cef_sandbox_lib)
    endif()
endif()

# macOS-specific settings
if(APPLE)
    set_target_properties(${CEF_TARGET} PROPERTIES
        MACOSX_BUNDLE_INFO_PLIST ${CMAKE_CURRENT_SOURCE_DIR}/resources/mac/Info.plist.in
    )
endif()

# Copy CEF binary and resource files to the target output directory
COPY_FILES("${CEF_TARGET}" "${CEF_BINARY_FILES}" "${CEF_BINARY_DIR}" "${TARGET_OUTPUT_DIR}")
COPY_FILES("${CEF_TARGET}" "${CEF_RESOURCE_FILES}" "${CEF_RESOURCE_DIR}" "${TARGET_OUTPUT_DIR}")

# macOS-specific app bundle setup
if(APPLE)
    # Copy the CEF framework to the app bundle
    add_custom_command(TARGET ${CEF_TARGET} POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E make_directory
        "$<TARGET_FILE_DIR:${CEF_TARGET}>/../Frameworks"
    )
    add_custom_command(TARGET ${CEF_TARGET} POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy_directory
        "${CEF_ROOT}/Release/Chromium Embedded Framework.framework"
        "$<TARGET_FILE_DIR:${CEF_TARGET}>/../Frameworks/Chromium Embedded Framework.framework"
    )
    
    # Copy test HTML file to Resources
    add_custom_command(TARGET ${CEF_TARGET} POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E make_directory
        "$<TARGET_FILE_DIR:${CEF_TARGET}>/../Resources"
    )
    add_custom_command(TARGET ${CEF_TARGET} POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy
        "${CMAKE_CURRENT_SOURCE_DIR}/resources/test.html"
        "$<TARGET_FILE_DIR:${CEF_TARGET}>/../Resources/test.html"
    )
endif()