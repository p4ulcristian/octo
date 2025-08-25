#include "client.h"
#include "include/wrapper/cef_helpers.h"

OAuthClient::OAuthClient(CefRefPtr<MainHandler> main_handler)
    : main_handler_(main_handler) {}

OAuthClient::~OAuthClient() {}

CefRefPtr<CefRequestHandler> OAuthClient::GetRequestHandler() {
  // Use the main handler's request handler (OAuth handler)
  return main_handler_->GetRequestHandler();
}

void OAuthClient::OnAfterCreated(CefRefPtr<CefBrowser> browser) {
  CEF_REQUIRE_UI_THREAD();
  popup_browser_ = browser;
}

void OAuthClient::OnBeforeClose(CefRefPtr<CefBrowser> browser) {
  CEF_REQUIRE_UI_THREAD();
  popup_browser_ = nullptr;
}

void OAuthClient::OnLoadStart(CefRefPtr<CefBrowser> browser,
                             CefRefPtr<CefFrame> frame,
                             TransitionType transition_type) {
  CEF_REQUIRE_UI_THREAD();
  
  if (frame->IsMain()) {
    // Update window title to show loading status
    OnTitleChange(browser, "Loading OAuth...");
  }
}

void OAuthClient::OnLoadEnd(CefRefPtr<CefBrowser> browser,
                           CefRefPtr<CefFrame> frame,
                           int httpStatusCode) {
  CEF_REQUIRE_UI_THREAD();
  
  if (frame->IsMain()) {
    // Load completed, title will be updated by OnTitleChange
  }
}

void OAuthClient::OnTitleChange(CefRefPtr<CefBrowser> browser,
                               const CefString& title) {
  CEF_REQUIRE_UI_THREAD();

  // Update the popup window title
#if defined(OS_WIN)
  if (browser && browser->GetHost()) {
    SetWindowText(browser->GetHost()->GetWindowHandle(), title.c_str());
  }
#elif defined(OS_MACOSX)
  // macOS title handling would go here
#elif defined(OS_LINUX)
  // Linux title handling would go here  
#endif
}
