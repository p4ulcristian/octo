#include "browser_window.h"
#include "include/wrapper/cef_helpers.h"

BrowserWindow::BrowserWindow() : handler_(new MainHandler(true)) {}

void BrowserWindow::CreateBrowserWindow(const CefString& url) {
  CEF_REQUIRE_UI_THREAD();
  
  // Create a simple browser view without Views framework
  // since the CEF version doesn't have all the APIs we need
  CefWindowInfo window_info;
  
#if defined(OS_WIN)
  window_info.SetAsPopup(nullptr, "CEF OAuth Browser");
  window_info.width = 1200;
  window_info.height = 800;
#elif defined(OS_MACOSX)
  // On macOS, create as a top-level window
  CefRect window_bounds(100, 100, 1200, 800);
  window_info.SetAsChild(nullptr, window_bounds);
  CefString(&window_info.window_name).FromASCII("CEF OAuth Browser");
#endif

  CefBrowserSettings browser_settings;
  
  // Create the browser without Views UI for now
  CefBrowserHost::CreateBrowser(window_info, handler_, url, browser_settings,
                                nullptr, nullptr);
}

// Stub implementations for the delegate methods
void BrowserWindow::OnBrowserCreated(CefRefPtr<CefBrowserView> browser_view,
                                     CefRefPtr<CefBrowser> browser) {}

void BrowserWindow::OnBrowserDestroyed(CefRefPtr<CefBrowserView> browser_view,
                                       CefRefPtr<CefBrowser> browser) {}

CefRefPtr<CefBrowserViewDelegate> BrowserWindow::GetDelegateForPopupBrowserView(
    CefRefPtr<CefBrowserView> browser_view,
    const CefBrowserSettings& settings,
    CefRefPtr<CefClient> client,
    bool is_devtools) {
  return nullptr;
}

bool BrowserWindow::OnPopupBrowserViewCreated(
    CefRefPtr<CefBrowserView> browser_view,
    CefRefPtr<CefBrowserView> popup_browser_view,
    bool is_devtools) {
  return false;
}

bool BrowserWindow::OnKeyEvent(CefRefPtr<CefTextfield> textfield,
                              const CefKeyEvent& event) {
  return false;
}

bool BrowserWindow::OnKeyEvent(CefRefPtr<CefWindow> window,
                              const CefKeyEvent& event) {
  return false;
}

void BrowserWindow::OnButtonPressed(CefRefPtr<CefButton> button) {}

void BrowserWindow::OnWindowCreated(CefRefPtr<CefWindow> window) {}

void BrowserWindow::OnWindowDestroyed(CefRefPtr<CefWindow> window) {}

bool BrowserWindow::CanClose(CefRefPtr<CefWindow> window) {
  return true;
}

CefSize BrowserWindow::GetPreferredSize(CefRefPtr<CefView> view) {
  return CefSize(1200, 800);
}
