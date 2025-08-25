#ifndef CEF_OAUTH_APP_H_
#define CEF_OAUTH_APP_H_

#include "include/cef_app.h"

class App : public CefApp, public CefBrowserProcessHandler {
 public:
  App();

  // CefApp methods:
  CefRefPtr<CefBrowserProcessHandler> GetBrowserProcessHandler() override {
    return this;
  }

  // CefBrowserProcessHandler methods:
  void OnContextInitialized() override;

 private:
  IMPLEMENT_REFCOUNTING(App);
};

#endif  // CEF_OAUTH_APP_H_

