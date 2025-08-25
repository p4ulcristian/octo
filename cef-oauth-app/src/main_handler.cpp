#include "main_handler.h"

#include <sstream>
#include <string>

#include "include/base/cef_callback.h"
#include "include/cef_app.h"
#include "include/cef_parser.h"
#include "include/views/cef_browser_view.h"
#include "include/views/cef_window.h"
#include "include/wrapper/cef_closure_task.h"
#include "include/wrapper/cef_helpers.h"

namespace {

MainHandler* g_instance = nullptr;

// Returns a data: URI with the specified contents
std::string GetDataURI(const std::string& data, const std::string& mime_type) {
  return "data:" + mime_type + ";base64," +
         CefURIEncode(CefBase64Encode(data.data(), data.size()), false)
             .ToString();
}

}  // namespace

MainHandler::MainHandler(bool use_views)
    : use_views_(use_views), is_closing_(false) {
  DCHECK(!g_instance);
  g_instance = this;
  
  // Initialize OAuth handler
  oauth_handler_ = new OAuthHandler();
}

MainHandler::~MainHandler() {
  g_instance = nullptr;
}

// static
MainHandler* MainHandler::GetInstance() {
  return g_instance;
}

CefRefPtr<CefRequestHandler> MainHandler::GetRequestHandler() {
  return oauth_handler_;
}

void MainHandler::OnTitleChange(CefRefPtr<CefBrowser> browser,
                               const CefString& title) {
  CEF_REQUIRE_UI_THREAD();

  if (use_views_) {
    // Set the title of the window using the Views framework
    CefRefPtr<CefBrowserView> browser_view =
        CefBrowserView::GetForBrowser(browser);
    if (browser_view) {
      CefRefPtr<CefWindow> window = browser_view->GetWindow();
      if (window) {
        window->SetTitle(title);
      }
    }
  } else if (!use_views_) {
    // Set the title of the window using platform APIs
    PlatformTitleChange(browser, title);
  }
}

bool MainHandler::OnBeforePopup(
    CefRefPtr<CefBrowser> browser,
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
    bool* no_javascript_access) {
  CEF_REQUIRE_UI_THREAD();

  // Check if this is an OAuth URL that should be handled in a popup
  std::string url = target_url;
  if (oauth_handler_->IsOAuthUrl(url)) {
    // Configure popup window for OAuth
#if defined(OS_WIN)
    windowInfo.SetAsPopup(nullptr, "OAuth Login");
    windowInfo.width = 600;
    windowInfo.height = 700;
#elif defined(OS_MACOSX)
    CefRect popup_bounds(150, 150, 600, 700);
    windowInfo.SetAsChild(nullptr, popup_bounds);
    CefString(&windowInfo.window_name).FromASCII("OAuth Login");
#endif
    
    // Use the same client (this handler) for OAuth popup
    client = this;
    return false;  // Allow popup creation
  }

  return false;  // Allow popup creation for other URLs too
}

void MainHandler::OnAfterCreated(CefRefPtr<CefBrowser> browser) {
  CEF_REQUIRE_UI_THREAD();

  // Add to the list of existing browsers
  browser_list_.push_back(browser);
}

bool MainHandler::DoClose(CefRefPtr<CefBrowser> browser) {
  CEF_REQUIRE_UI_THREAD();

  // Closing the main window requires special handling
  if (browser_list_.size() == 1) {
    // Set a flag to indicate that the window close should be allowed
    is_closing_ = true;
  }

  // Allow the close. For windowed browsers this will result in the OS close
  // event being sent
  return false;
}

void MainHandler::OnBeforeClose(CefRefPtr<CefBrowser> browser) {
  CEF_REQUIRE_UI_THREAD();

  // Remove from the list of existing browsers
  BrowserList::iterator bit = browser_list_.begin();
  for (; bit != browser_list_.end(); ++bit) {
    if ((*bit)->IsSame(browser)) {
      browser_list_.erase(bit);
      break;
    }
  }

  if (browser_list_.empty()) {
    // All browser windows have closed. Quit the application message loop
    CefQuitMessageLoop();
  }
}

void MainHandler::OnLoadError(CefRefPtr<CefBrowser> browser,
                             CefRefPtr<CefFrame> frame,
                             ErrorCode errorCode,
                             const CefString& errorText,
                             const CefString& failedUrl) {
  CEF_REQUIRE_UI_THREAD();

  // Don't display an error for downloaded files
  if (errorCode == ERR_ABORTED) {
    return;
  }

  // Display a load error message using a data: URI
  std::stringstream ss;
  ss << "<html><body bgcolor=\"white\">"
        "<h2>Failed to load URL "
     << std::string(failedUrl) << " with error " << std::string(errorText)
     << " (" << errorCode << ").</h2></body></html>";

  frame->LoadURL(GetDataURI(ss.str(), "text/html"));
}

void MainHandler::CloseAllBrowsers(bool force_close) {
  if (!CefCurrentlyOn(TID_UI)) {
    // Execute on the UI thread
    CefPostTask(TID_UI, base::BindOnce(&MainHandler::CloseAllBrowsers, this,
                                       force_close));
    return;
  }

  if (browser_list_.empty()) {
    return;
  }

  BrowserList::const_iterator it = browser_list_.begin();
  for (; it != browser_list_.end(); ++it) {
    (*it)->GetHost()->CloseBrowser(force_close);
  }
}

void MainHandler::PlatformTitleChange(CefRefPtr<CefBrowser> browser,
                                     const CefString& title) {
  // Platform-specific implementation would go here
  // For simplicity, we'll leave this empty in this example
}
