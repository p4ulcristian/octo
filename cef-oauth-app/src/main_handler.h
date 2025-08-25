#ifndef CEF_OAUTH_MAIN_HANDLER_H_
#define CEF_OAUTH_MAIN_HANDLER_H_

#include "include/cef_client.h"
#include "include/views/cef_browser_view.h"
#include "include/views/cef_window.h"
#include "include/views/cef_textfield.h"
#include "include/views/cef_button.h"

#include <list>

#include "oauth_handler.h"

class MainHandler : public CefClient,
                   public CefDisplayHandler,
                   public CefLifeSpanHandler,
                   public CefLoadHandler {
 public:
  explicit MainHandler(bool use_views);
  ~MainHandler();

  // Provide access to the single global instance of this object
  static MainHandler* GetInstance();

  // CefClient methods:
  CefRefPtr<CefDisplayHandler> GetDisplayHandler() override {
    return this;
  }
  CefRefPtr<CefLifeSpanHandler> GetLifeSpanHandler() override {
    return this;
  }
  CefRefPtr<CefLoadHandler> GetLoadHandler() override {
    return this;
  }
  CefRefPtr<CefRequestHandler> GetRequestHandler() override;

  // CefDisplayHandler methods:
  void OnTitleChange(CefRefPtr<CefBrowser> browser,
                     const CefString& title) override;

  // CefLifeSpanHandler methods:
  bool OnBeforePopup(CefRefPtr<CefBrowser> browser,
                     CefRefPtr<CefFrame> frame,
                     int popup_id,
                     const CefString& target_url,
                     const CefString& target_frame_name,
                     CefLifeSpanHandler::WindowOpenDisposition target_disposition,
                     bool user_gesture,
                     const CefPopupFeatures& popupFeatures,
                     CefWindowInfo& windowInfo,
                     CefRefPtr<CefClient>& client,
                     CefBrowserSettings& settings,
                     CefRefPtr<CefDictionaryValue>& extra_info,
                     bool* no_javascript_access) override;

  void OnAfterCreated(CefRefPtr<CefBrowser> browser) override;
  bool DoClose(CefRefPtr<CefBrowser> browser) override;
  void OnBeforeClose(CefRefPtr<CefBrowser> browser) override;

  // CefLoadHandler methods:
  void OnLoadError(CefRefPtr<CefBrowser> browser,
                   CefRefPtr<CefFrame> frame,
                   ErrorCode errorCode,
                   const CefString& errorText,
                   const CefString& failedUrl) override;

  // Request that all existing browser windows close
  void CloseAllBrowsers(bool force_close);

  bool IsClosing() const { return is_closing_; }

 private:
  // Platform-specific implementation
  void PlatformTitleChange(CefRefPtr<CefBrowser> browser,
                          const CefString& title);

  // True if the application is using the Views framework
  const bool use_views_;

  // List of existing browser windows. Only accessed on the CEF UI thread
  typedef std::list<CefRefPtr<CefBrowser>> BrowserList;
  BrowserList browser_list_;

  bool is_closing_;

  // OAuth handler for intercepting OAuth callbacks
  CefRefPtr<OAuthHandler> oauth_handler_;

  // Include the default reference counting implementation
  IMPLEMENT_REFCOUNTING(MainHandler);
};

#endif  // CEF_OAUTH_MAIN_HANDLER_H_
