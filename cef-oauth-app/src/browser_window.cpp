#include "browser_window.h"
#include "include/wrapper/cef_helpers.h"

#if defined(OS_MACOSX)
// Forward declaration to avoid Objective-C headers in C++ file
class NativeMacWindow {
public:
  static void CreateDualBrowserWindow(CefRefPtr<MainHandler> handler);
};
#endif

BrowserWindow::BrowserWindow() : handler_(new MainHandler(true)) {}

void BrowserWindow::CreateBrowserWindow(const CefString& url) {
  CEF_REQUIRE_UI_THREAD();
  
  printf("Creating native macOS window with dual CEF browsers\n");
  
#if defined(OS_MACOSX)
  // Use our native macOS window implementation
  NativeMacWindow::CreateDualBrowserWindow(handler_);
#else
  // Fallback for other platforms - create simple browser
  CefWindowInfo window_info;
  CefBrowserSettings browser_settings;
  CefBrowserHost::CreateBrowser(window_info, handler_, url, browser_settings,
                                nullptr, nullptr);
#endif
}

void BrowserWindow::OnBrowserCreated(CefRefPtr<CefBrowserView> browser_view,
                                     CefRefPtr<CefBrowser> browser) {
  CEF_REQUIRE_UI_THREAD();
  UpdateNavigationButtons();
}

void BrowserWindow::OnBrowserDestroyed(CefRefPtr<CefBrowserView> browser_view,
                                       CefRefPtr<CefBrowser> browser) {
  CEF_REQUIRE_UI_THREAD();
}

CefRefPtr<CefBrowserViewDelegate> BrowserWindow::GetDelegateForPopupBrowserView(
    CefRefPtr<CefBrowserView> browser_view,
    const CefBrowserSettings& settings,
    CefRefPtr<CefClient> client,
    bool is_devtools) {
  CEF_REQUIRE_UI_THREAD();
  return this;
}

bool BrowserWindow::OnPopupBrowserViewCreated(
    CefRefPtr<CefBrowserView> browser_view,
    CefRefPtr<CefBrowserView> popup_browser_view,
    bool is_devtools) {
  CEF_REQUIRE_UI_THREAD();
  
  // Create a new window for the popup
  CefRefPtr<CefWindow> popup_window = CefWindow::CreateTopLevelWindow(nullptr);
  popup_window->SetTitle("OAuth Login");
  popup_window->AddChildView(popup_browser_view);
  popup_window->CenterWindow(CefSize(600, 700));
  popup_window->Show();
  popup_browser_view->RequestFocus();
  
  return true;
}

bool BrowserWindow::OnKeyEvent(CefRefPtr<CefTextfield> textfield,
                              const CefKeyEvent& event) {
  CEF_REQUIRE_UI_THREAD();
  
  // Handle Enter key in URL bar
  if (event.type == KEYEVENT_RAWKEYDOWN && event.windows_key_code == 13) {
    OnAddressBarEnter();
    return true;
  }
  
  return false;
}

bool BrowserWindow::OnKeyEvent(CefRefPtr<CefWindow> window,
                              const CefKeyEvent& event) {
  CEF_REQUIRE_UI_THREAD();
  
  // Handle window-level key events if needed
  return false;
}

void BrowserWindow::OnButtonPressed(CefRefPtr<CefButton> button) {
  CEF_REQUIRE_UI_THREAD();
  
  int id = button->GetID();
  switch (id) {
    case ID_BACK_BUTTON:
      OnBackButtonPressed();
      break;
    case ID_FORWARD_BUTTON:
      OnForwardButtonPressed();
      break;
    case ID_RELOAD_BUTTON:
      OnReloadButtonPressed();
      break;
    case ID_STOP_BUTTON:
      OnStopButtonPressed();
      break;
  }
}

void BrowserWindow::OnWindowCreated(CefRefPtr<CefWindow> window) {
  CEF_REQUIRE_UI_THREAD();
  
  // Set up button click handlers
  window->GetViewForID(ID_BACK_BUTTON)->SetEnabled(false);
  window->GetViewForID(ID_FORWARD_BUTTON)->SetEnabled(false);
  
  // Register button click handlers using C++ lambda
  CefRefPtr<CefView> back_view = window->GetViewForID(ID_BACK_BUTTON);
  if (back_view && back_view->AsButton()) {
    back_view->AsButton()->SetInkDropEnabled(true);
  }
  
  CefRefPtr<CefView> forward_view = window->GetViewForID(ID_FORWARD_BUTTON);
  if (forward_view && forward_view->AsButton()) {
    forward_view->AsButton()->SetInkDropEnabled(true);
  }
  
  CefRefPtr<CefView> reload_view = window->GetViewForID(ID_RELOAD_BUTTON);
  if (reload_view && reload_view->AsButton()) {
    reload_view->AsButton()->SetInkDropEnabled(true);
  }
  
  CefRefPtr<CefView> stop_view = window->GetViewForID(ID_STOP_BUTTON);
  if (stop_view && stop_view->AsButton()) {
    stop_view->AsButton()->SetInkDropEnabled(true);
  }
}

void BrowserWindow::OnWindowDestroyed(CefRefPtr<CefWindow> window) {
  CEF_REQUIRE_UI_THREAD();
  browser_view_ = nullptr;
}

bool BrowserWindow::CanClose(CefRefPtr<CefWindow> window) {
  CEF_REQUIRE_UI_THREAD();
  
  // Allow the window to close
  CefRefPtr<CefBrowser> browser = browser_view_->GetBrowser();
  if (browser) {
    browser->GetHost()->CloseBrowser(false);
  }
  return true;
}

CefSize BrowserWindow::GetPreferredSize(CefRefPtr<CefView> view) {
  CEF_REQUIRE_UI_THREAD();
  return CefSize(1200, 800);
}

void BrowserWindow::OnBackButtonPressed() {
  if (browser_view_ && browser_view_->GetBrowser()) {
    browser_view_->GetBrowser()->GoBack();
  }
}

void BrowserWindow::OnForwardButtonPressed() {
  if (browser_view_ && browser_view_->GetBrowser()) {
    browser_view_->GetBrowser()->GoForward();
  }
}

void BrowserWindow::OnReloadButtonPressed() {
  if (browser_view_ && browser_view_->GetBrowser()) {
    browser_view_->GetBrowser()->Reload();
  }
}

void BrowserWindow::OnStopButtonPressed() {
  if (browser_view_ && browser_view_->GetBrowser()) {
    browser_view_->GetBrowser()->StopLoad();
  }
}

void BrowserWindow::OnAddressBarEnter() {
  if (address_bar_ && browser_view_ && browser_view_->GetBrowser()) {
    CefString url = address_bar_->GetText();
    
    // Add http:// if no protocol specified
    std::string url_str = url.ToString();
    if (url_str.find("://") == std::string::npos) {
      if (url_str.find("localhost") == 0 || url_str.find("127.0.0.1") == 0) {
        url_str = "http://" + url_str;
      } else {
        url_str = "https://" + url_str;
      }
    }
    
    browser_view_->GetBrowser()->GetMainFrame()->LoadURL(url_str);
  }
}

void BrowserWindow::UpdateNavigationButtons() {
  if (!browser_view_ || !browser_view_->GetBrowser()) {
    return;
  }
  
  CefRefPtr<CefBrowser> browser = browser_view_->GetBrowser();
  
  if (back_button_) {
    back_button_->SetEnabled(browser->CanGoBack());
  }
  
  if (forward_button_) {
    forward_button_->SetEnabled(browser->CanGoForward());
  }
}
