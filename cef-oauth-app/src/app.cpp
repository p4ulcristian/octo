#include "app.h"

#include <string>

#include "include/cef_browser.h"
#include "include/cef_command_line.h"
#include "include/views/cef_browser_view.h"
#include "include/views/cef_window.h"
#include "include/wrapper/cef_helpers.h"

#if defined(OS_MACOSX)
#include <CoreFoundation/CoreFoundation.h>
#endif

#include "main_handler.h"

App::App() {}

void App::OnContextInitialized() {
  CEF_REQUIRE_UI_THREAD();

  CefRefPtr<MainHandler> handler(new MainHandler(false));

  // Specify CEF browser settings here
  CefBrowserSettings browser_settings;

  std::string url;

  // Check if a URL was provided via command line
  CefRefPtr<CefCommandLine> command_line =
      CefCommandLine::GetGlobalCommandLine();
  if (command_line->HasArguments()) {
    CefCommandLine::ArgumentList args;
    command_line->GetArguments(args);
    if (!args.empty()) {
      url = args[0];
    }
  }
  
  // Default to bundled test HTML file if no URL provided
  if (url.empty()) {
#if defined(OS_MACOSX)
    // Get the path to the app bundle Resources directory
    url = "file:///Contents/Resources/test.html";
    // Try to get the bundle path programmatically
    CFBundleRef bundle = CFBundleGetMainBundle();
    if (bundle) {
      CFURLRef resourceURL = CFBundleCopyResourceURL(bundle, CFSTR("test"), CFSTR("html"), nullptr);
      if (resourceURL) {
        CFStringRef path = CFURLCopyFileSystemPath(resourceURL, kCFURLPOSIXPathStyle);
        if (path) {
          char pathBuffer[1024];
          if (CFStringGetCString(path, pathBuffer, sizeof(pathBuffer), kCFStringEncodingUTF8)) {
            url = std::string("file://") + pathBuffer;
          }
          CFRelease(path);
        }
        CFRelease(resourceURL);
      }
    }
#else
    url = "https://www.google.com";
#endif
  }

  // Information used when creating the native window
  CefWindowInfo window_info;

#if defined(OS_WIN)
  // On Windows we need to specify certain flags that will be passed to
  // CreateWindowEx()
  window_info.SetAsPopup(nullptr, "CEF OAuth App");
  window_info.width = 1200;
  window_info.height = 800;
#elif defined(OS_MACOSX)
  // On macOS, create as a top-level window
  CefRect window_bounds(100, 100, 1200, 800);
  window_info.SetAsChild(nullptr, window_bounds);
  // Set window name
  CefString(&window_info.window_name).FromASCII("CEF OAuth App");
#endif

  // Create the first browser window
  CefBrowserHost::CreateBrowser(window_info, handler, url, browser_settings,
                                nullptr, nullptr);
}
