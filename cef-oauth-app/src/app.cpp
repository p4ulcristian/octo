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
#include "browser_window.h"

App::App() {}

void App::OnBeforeCommandLineProcessing(const CefString& process_type,
                                        CefRefPtr<CefCommandLine> command_line) {
  // Run everything in-process to avoid crashes
  command_line->AppendSwitch("single-process");
  command_line->AppendSwitch("disable-web-security");
  command_line->AppendSwitch("disable-features=VizDisplayCompositor");
}

void App::OnContextInitialized() {
  CEF_REQUIRE_UI_THREAD();

#if 1  // Use Views framework for better UI
  // Create browser window with navigation controls
  CefRefPtr<BrowserWindow> browser_window = new BrowserWindow();

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
  
  // Default to a simple data URL if no URL provided
  if (url.empty()) {
    url = "data:text/html,<html><head><title>CEF OAuth Browser</title></head><body style='font-family:Arial;padding:50px;'><h1>CEF OAuth Browser is Working!</h1><p>This browser is running Chrome 139 with OAuth interception.</p><p>Navigate to any OAuth provider to test the functionality:</p><ul><li><a href='https://accounts.google.com'>Google OAuth</a></li><li><a href='https://github.com/login'>GitHub OAuth</a></li><li><a href='https://www.google.com'>Test Google.com</a></li></ul></body></html>";
  }

  printf("Creating browser with URL: %s\n", url.c_str());

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

  // Create browser window with UI controls
  browser_window->CreateBrowserWindow(url);
#else
  // Fallback to old method without Views
  CefRefPtr<MainHandler> handler(new MainHandler(false));
  CefBrowserHost::CreateBrowser(window_info, handler, url, browser_settings,
                                nullptr, nullptr);
#endif
}
