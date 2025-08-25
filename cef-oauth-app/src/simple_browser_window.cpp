#include "browser_window.h"
#include "include/wrapper/cef_helpers.h"

BrowserWindow::BrowserWindow() : handler_(new MainHandler(true)) {}

void BrowserWindow::CreateBrowserWindow(const CefString& url) {
  CEF_REQUIRE_UI_THREAD();
  
  printf("Creating dual browser windows - Google & YouTube\n");
  
  // Create left browser (Google) 
  CefWindowInfo left_window_info;
#if defined(OS_MACOSX)
  CefRect left_bounds(100, 100, 600, 800);  // Left half
  left_window_info.SetAsChild(nullptr, left_bounds);
  CefString(&left_window_info.window_name).FromASCII("Google - CEF OAuth Browser");
#endif
  
  CefBrowserSettings left_browser_settings;
  CefBrowserHost::CreateBrowser(left_window_info, handler_, "https://www.google.com", 
                                left_browser_settings, nullptr, nullptr);
  
  // Create right browser (YouTube)
  CefWindowInfo right_window_info;
#if defined(OS_MACOSX)
  CefRect right_bounds(700, 100, 600, 800);  // Right half
  right_window_info.SetAsChild(nullptr, right_bounds);
  CefString(&right_window_info.window_name).FromASCII("YouTube - CEF OAuth Browser");
#endif
  
  CefBrowserSettings right_browser_settings;
  CefBrowserHost::CreateBrowser(right_window_info, handler_, "https://www.youtube.com",
                                right_browser_settings, nullptr, nullptr);
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
