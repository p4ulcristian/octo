# CEF OAuth Application

A cross-platform C++ application built with the Chromium Embedded Framework (CEF) that demonstrates OAuth integration with automatic callback URL interception and popup window management.

## Features

- **Cross-platform support**: Windows, macOS, and Linux
- **Automatic CEF binary download**: CMake automatically downloads and configures CEF
- **OAuth URL interception**: Automatically captures OAuth callback URLs
- **Popup window management**: Handles OAuth popups with proper cleanup
- **Multiple OAuth providers**: Pre-configured for Google, GitHub, and custom providers
- **Authorization code extraction**: Automatically extracts authorization codes from callback URLs
- **Error handling**: Processes OAuth errors and displays user-friendly messages

## Prerequisites

- **CMake** 3.19 or later
- **C++17** compatible compiler
- **Git** (for downloading dependencies)

### Platform-specific requirements:

**Windows:**
- Visual Studio 2017 or later
- Windows SDK

**macOS:**
- Xcode command line tools
- macOS 10.10 or later

**Linux:**
- GCC 7.0+ or Clang 5.0+
- Development packages: `libgtk-3-dev`, `libx11-dev`

## Building the Application

### 1. Clone and Setup

```bash
# Navigate to your project directory
cd cef-oauth-app

# Create build directory
mkdir build
cd build
```

### 2. Configure and Build

**On Windows:**
```bash
cmake .. -G "Visual Studio 16 2019" -A x64
cmake --build . --config Release
```

**On macOS:**
```bash
cmake .. -G "Xcode"
cmake --build . --config Release
```

**On Linux:**
```bash
cmake .. -G "Unix Makefiles"
make -j$(nproc)
```

### 3. Run the Application

**Windows:**
```bash
./Release/cef_oauth_app.exe
```

**macOS:**
```bash
open ./Release/cef_oauth_app.app
```

**Linux:**
```bash
./cef_oauth_app
```

## Usage

### Basic Usage

1. Run the application
2. The main window will open with a test page
3. Click OAuth provider buttons to test the flow
4. OAuth popups will open and automatically close after processing callbacks

### Custom OAuth Configuration

To configure your own OAuth providers:

1. **Modify the test HTML** (`resources/test.html`):
   ```html
   <a href="https://your-oauth-provider.com/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:8080/callback" 
      class="oauth-button">Your OAuth Provider</a>
   ```

2. **Add callback patterns** in `oauth_handler.cpp`:
   ```cpp
   void OAuthHandler::ConfigureCustomOAuth(const std::string& callback_pattern) {
       oauth_patterns_.push_back(".*://your-callback-domain\\.com.*");
       oauth_callback_urls_.push_back("https://your-callback-domain.com");
   }
   ```

3. **Set up OAuth callback** in your application code:
   ```cpp
   oauth_handler->SetOAuthCallback([](const std::string& code, const std::string& error) {
       if (!code.empty()) {
           std::cout << "Got authorization code: " << code << std::endl;
           // Exchange code for access token
       }
       if (!error.empty()) {
           std::cout << "OAuth error: " << error << std::endl;
       }
   });
   ```

## Architecture

### Core Components

- **`App`**: Main CEF application class that initializes the browser
- **`MainHandler`**: Handles browser lifecycle, window management, and delegates to OAuth handler
- **`OAuthHandler`**: Intercepts OAuth URLs, extracts authorization codes, and manages callbacks
- **`OAuthClient`**: Specialized client for OAuth popup windows

### OAuth Flow

1. User clicks OAuth link in main window
2. `OnBeforePopup` checks if URL is OAuth-related
3. Popup window opens with OAuth provider page
4. User completes OAuth flow
5. `OnBeforeBrowse` intercepts callback URL
6. Authorization code is extracted and processed
7. Popup window closes automatically
8. Main application receives OAuth results

## Customization

### Adding New OAuth Providers

1. **Configure provider patterns**:
   ```cpp
   void ConfigureCustomProvider() {
       oauth_patterns_.push_back(".*://provider\\.com/callback.*");
       oauth_callback_urls_.push_back("https://provider.com/callback");
   }
   ```

2. **Handle provider-specific parameters**:
   ```cpp
   std::string ExtractCustomParameter(const std::string& url) {
       std::regex param_regex("[&?]custom_param=([^&]+)");
       std::smatch match;
       if (std::regex_search(url, match, param_regex)) {
           return CefURIDecode(match[1].str(), true, 
                              cef_uri_unescape_rule_t::UU_SPACES).ToString();
       }
       return "";
   }
   ```

### Popup Window Customization

Modify popup window properties in `MainHandler::OnBeforePopup()`:

```cpp
// Customize popup window size and position
windowInfo.width = 800;
windowInfo.height = 600;
windowInfo.x = 100;
windowInfo.y = 100;

#if defined(OS_WIN)
windowInfo.SetAsPopup(parent_window, "Custom OAuth Window");
#endif
```

## Debugging

### Enable CEF Debug Logging

Add to your main function:

```cpp
CefSettings settings;
settings.log_severity = LOGSEVERITY_INFO;
settings.log_file = "cef_debug.log";
```

### OAuth Callback Testing

Use the built-in test callback URL:
```
http://localhost:8080/callback?code=test_auth_code_12345&state=test
```

## Troubleshooting

### Common Issues

**Build fails with CEF download errors:**
- Check internet connection
- Try clearing CMake cache: `rm -rf build/`
- Verify CMake version is 3.19+

**OAuth callbacks not intercepted:**
- Verify callback URL patterns in `oauth_handler.cpp`
- Check console output for intercepted URLs
- Ensure redirect URIs match your OAuth provider configuration

**Popup windows not closing:**
- Check browser list management in `MainHandler`
- Verify `OnBeforeClose` is called properly
- Review popup detection logic in `OnBeforePopup`

**macOS code signing issues:**
- For development, disable code signing requirements
- For distribution, configure proper code signing certificates

## License

This project is provided as an example and is available under the MIT License. CEF itself is subject to separate licensing terms.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on multiple platforms
5. Submit a pull request

## Additional Resources

- [CEF Documentation](https://bitbucket.org/chromiumembedded/cef/wiki/Home)
- [CEF C++ API Reference](https://cef-builds.spotifycdn.com/docs/index.html)
- [OAuth 2.0 RFC](https://tools.ietf.org/html/rfc6749)