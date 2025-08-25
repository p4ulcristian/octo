#include "include/cef_app.h"
#include "include/cef_client.h"
#include "include/wrapper/cef_helpers.h"

#include "app.h"

#if defined(CEF_X11)
#include <X11/Xlib.h>
#endif

#if defined(OS_MACOSX)
#include "include/wrapper/cef_library_loader.h"
#endif

namespace {

int RunMain(CefRefPtr<CefApp> app, int argc, char* argv[]) {
#if defined(OS_MACOSX)
  // Load the CEF framework library at runtime instead of linking directly
  // as required by the macOS sandbox implementation.
  CefScopedLibraryLoader library_loader;
  if (!library_loader.LoadInMain()) {
    return 1;
  }
#endif

  // Provide CEF with command-line arguments.
  CefMainArgs main_args(argc, argv);

  // CEF applications have multiple sub-processes (render, plugin, GPU, etc)
  // that share the same executable. This function checks the command-line and,
  // if this is a sub-process, executes the appropriate logic.
  int exit_code = CefExecuteProcess(main_args, app, nullptr);
  if (exit_code >= 0) {
    // The sub-process has completed so return here.
    return exit_code;
  }

  // Parse command-line arguments for use in this method.
  CefRefPtr<CefCommandLine> command_line = CefCommandLine::CreateCommandLine();
  command_line->InitFromArgv(argc, argv);

  // Specify CEF global settings here.
  CefSettings settings;

#if !defined(CEF_USE_SANDBOX)
  settings.no_sandbox = true;
#endif

  // Initialize CEF for the browser process.
  CefInitialize(main_args, settings, app, nullptr);

  // Run the CEF message loop. This will block until CefQuitMessageLoop() is
  // called.
  CefRunMessageLoop();

  // Shut down CEF.
  CefShutdown();

  return 0;
}

}  // namespace

// Entry point function for all processes.
int main(int argc, char* argv[]) {
  // High-DPI support is now handled automatically by CEF

#if defined(CEF_X11)
  // Install xlib error handlers so that the application won't be terminated
  // on non-fatal errors.
  XSetErrorHandler([](Display* display, XErrorEvent* event) -> int {
    LOG(WARNING)
        << "X error received: "
        << "type " << event->type << ", "
        << "serial " << event->serial << ", "
        << "error_code " << static_cast<int>(event->error_code) << ", "
        << "request_code " << static_cast<int>(event->request_code) << ", "
        << "minor_code " << static_cast<int>(event->minor_code);
    return 0;
  });
#endif

  // Create the main application object.
  CefRefPtr<App> app(new App);

  // Execute the main function.
  return RunMain(app, argc, argv);
}
