#ifndef CEF_OAUTH_OAUTH_HANDLER_H_
#define CEF_OAUTH_OAUTH_HANDLER_H_

#include "include/cef_request_handler.h"
#include <vector>
#include <string>
#include <functional>

class OAuthHandler : public CefRequestHandler {
 public:
  OAuthHandler();
  virtual ~OAuthHandler();

  // CefRequestHandler methods:
  bool OnBeforeBrowse(CefRefPtr<CefBrowser> browser,
                      CefRefPtr<CefFrame> frame,
                      CefRefPtr<CefRequest> request,
                      bool user_gesture,
                      bool is_redirect) override;

  CefRefPtr<CefResourceRequestHandler> GetResourceRequestHandler(
      CefRefPtr<CefBrowser> browser,
      CefRefPtr<CefFrame> frame,
      CefRefPtr<CefRequest> request,
      bool is_navigation,
      bool is_download,
      const CefString& request_initiator,
      bool& disable_default_handling) override;

  // OAuth-specific methods
  bool IsOAuthUrl(const std::string& url);
  void AddOAuthCallbackUrl(const std::string& callback_url);
  void SetOAuthCallback(std::function<void(const std::string&, const std::string&)> callback);
  
  // Common OAuth providers
  void ConfigureGoogleOAuth();
  void ConfigureGitHubOAuth();
  void ConfigureCustomOAuth(const std::string& callback_pattern);

 private:
  bool IsCallbackUrl(const std::string& url);
  void HandleOAuthCallback(CefRefPtr<CefBrowser> browser, const std::string& url);
  std::string ExtractAuthorizationCode(const std::string& url);
  std::string ExtractErrorFromUrl(const std::string& url);

  std::vector<std::string> oauth_callback_urls_;
  std::vector<std::string> oauth_patterns_;
  std::function<void(const std::string&, const std::string&)> oauth_callback_;

  IMPLEMENT_REFCOUNTING(OAuthHandler);
};

#endif  // CEF_OAUTH_OAUTH_HANDLER_H_
