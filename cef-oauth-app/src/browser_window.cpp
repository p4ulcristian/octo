#include "browser_window.h"
#include "include/wrapper/cef_helpers.h"

BrowserWindow::BrowserWindow() : handler_(new MainHandler(true)) {}

void BrowserWindow::CreateBrowserWindow(const CefString& url) {
  CEF_REQUIRE_UI_THREAD();
  
  // Create the BrowserView
  CefBrowserSettings browser_settings;
  browser_view_ = CefBrowserView::CreateBrowserView(
      handler_, url, browser_settings, nullptr, nullptr, this);
  
  // Create the Window
  window_ = CefWindow::CreateTopLevelWindow(this);
  
  // Set window title
  window_->SetTitle("CEF OAuth Browser");
  
  // Create the main panel that will contain navigation bar and browser
  CefRefPtr<CefPanel> panel = CefPanel::CreatePanel(nullptr);
  CefRefPtr<CefBoxLayout> layout = CefBoxLayout::CreateBoxLayout(
      CEF_AXIS_LAYOUT_VERTICAL, CefInsets(), 0);
  panel->SetLayout(layout);
  
  // Create navigation bar
  CefRefPtr<CefPanel> nav_bar = CefPanel::CreatePanel(nullptr);
  CefRefPtr<CefBoxLayout> nav_layout = CefBoxLayout::CreateBoxLayout(
      CEF_AXIS_LAYOUT_HORIZONTAL, CefInsets(5, 5, 5, 5), 5);
  nav_bar->SetLayout(nav_layout);
  nav_bar->SetHeightDIP(40);
  
  // Create navigation buttons
  back_button_ = CefLabelButton::CreateLabelButton(
      this, "←", true);
  back_button_->SetID(ID_BACK_BUTTON);
  back_button_->SetMinimumSizeDIP(CefSize(30, 30));
  nav_bar->AddChildView(back_button_);
  
  forward_button_ = CefLabelButton::CreateLabelButton(
      this, "→", true);
  forward_button_->SetID(ID_FORWARD_BUTTON);
  forward_button_->SetMinimumSizeDIP(CefSize(30, 30));
  nav_bar->AddChildView(forward_button_);
  
  reload_button_ = CefLabelButton::CreateLabelButton(
      this, "↻", true);
  reload_button_->SetID(ID_RELOAD_BUTTON);
  reload_button_->SetMinimumSizeDIP(CefSize(30, 30));
  nav_bar->AddChildView(reload_button_);
  
  stop_button_ = CefLabelButton::CreateLabelButton(
      this, "✕", true);
  stop_button_->SetID(ID_STOP_BUTTON);
  stop_button_->SetMinimumSizeDIP(CefSize(30, 30));
  nav_bar->AddChildView(stop_button_);
  
  // Create URL bar
  address_bar_ = CefTextfield::CreateTextfield(this);
  address_bar_->SetText(url);
  address_bar_->SetTextColor(0xFF000000);
  address_bar_->SetBackgroundColor(0xFFFFFFFF);
  nav_layout->SetFlexForView(address_bar_, 1);  // Make URL bar expand
  nav_bar->AddChildView(address_bar_);
  
  // Add OAuth test button
  CefRefPtr<CefLabelButton> oauth_button = CefLabelButton::CreateLabelButton(
      nullptr, "OAuth Test", true);
  oauth_button->SetMinimumSizeDIP(CefSize(80, 30));
  nav_bar->AddChildView(oauth_button);
  
  // Add navigation bar and browser view to main panel
  panel->AddChildView(nav_bar);
  layout->SetFlexForView(browser_view_, 1);  // Make browser view expand
  panel->AddChildView(browser_view_);
  
  // Add panel to window
  window_->AddChildView(panel);
  
  // Show the window
  window_->CenterWindow(CefSize(1200, 800));
  window_->Show();
  
  // Focus the browser view
  browser_view_->RequestFocus();
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