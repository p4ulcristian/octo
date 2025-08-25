#ifndef CEF_OAUTH_CLIENT_H_
#define CEF_OAUTH_CLIENT_H_

#include "include/cef_client.h"
#include "main_handler.h"

// Client implementation for OAuth popup windows
class OAuthClient : public CefClient,
                   public CefLifeSpanHandler,
                   public CefLoadHandler,
                   public CefDisplayHandler {
 public:
  explicit OAuthClient(CefRefPtr<MainHandler> main_handler);
  ~OAuthClient();

  // CefClient methods:
  CefRefPtr<CefLifeSpanHandler> GetLifeSpanHandler() override {
    return this;
  }
  CefRefPtr<CefLoadHandler> GetLoadHandler() override {
    return this;
  }
  CefRefPtr<CefDisplayHandler> GetDisplayHandler() override {
    return this;
  }
  CefRefPtr<CefRequestHandler> GetRequestHandler() override;

  // CefLifeSpanHandler methods:
  void OnAfterCreated(CefRefPtr<CefBrowser> browser) override;
  void OnBeforeClose(CefRefPtr<CefBrowser> browser) override;

  // CefLoadHandler methods:
  void OnLoadStart(CefRefPtr<CefBrowser> browser,
                   CefRefPtr<CefFrame> frame,
                   TransitionType transition_type) override;

  void OnLoadEnd(CefRefPtr<CefBrowser> browser,
                 CefRefPtr<CefFrame> frame,
                 int httpStatusCode) override;

  // CefDisplayHandler methods:
  void OnTitleChange(CefRefPtr<CefBrowser> browser,
                     const CefString& title) override;

 private:
  CefRefPtr<MainHandler> main_handler_;
  CefRefPtr<CefBrowser> popup_browser_;

  IMPLEMENT_REFCOUNTING(OAuthClient);
};

#endif  // CEF_OAUTH_CLIENT_H_
