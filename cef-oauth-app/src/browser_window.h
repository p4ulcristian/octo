#ifndef CEF_OAUTH_BROWSER_WINDOW_H_
#define CEF_OAUTH_BROWSER_WINDOW_H_

#include "include/cef_app.h"
#include "include/views/cef_browser_view.h"
#include "include/views/cef_browser_view_delegate.h"
#include "include/views/cef_button.h"
#include "include/views/cef_label_button.h"
#include "include/views/cef_textfield.h"
#include "include/views/cef_textfield_delegate.h"
#include "include/views/cef_window.h"
#include "include/views/cef_window_delegate.h"
#include "include/views/cef_box_layout.h"
#include "include/views/cef_panel.h"

#include "main_handler.h"

// Implements a CEF window with navigation controls and URL bar
class BrowserWindow : public CefBrowserViewDelegate,
                     public CefTextfieldDelegate,
                     public CefWindowDelegate,
                     public CefButtonDelegate {
 public:
  BrowserWindow();
  
  // Create and show the browser window
  void CreateBrowserWindow(const CefString& url);
  
  // CefBrowserViewDelegate methods:
  void OnBrowserCreated(CefRefPtr<CefBrowserView> browser_view,
                       CefRefPtr<CefBrowser> browser) override;
  void OnBrowserDestroyed(CefRefPtr<CefBrowserView> browser_view,
                         CefRefPtr<CefBrowser> browser) override;
  CefRefPtr<CefBrowserViewDelegate> GetDelegateForPopupBrowserView(
      CefRefPtr<CefBrowserView> browser_view,
      const CefBrowserSettings& settings,
      CefRefPtr<CefClient> client,
      bool is_devtools) override;
  bool OnPopupBrowserViewCreated(CefRefPtr<CefBrowserView> browser_view,
                                CefRefPtr<CefBrowserView> popup_browser_view,
                                bool is_devtools) override;
  
  // CefTextfieldDelegate methods:
  bool OnKeyEvent(CefRefPtr<CefTextfield> textfield,
                 const CefKeyEvent& event) override;
  
  // CefButtonDelegate methods:
  void OnButtonPressed(CefRefPtr<CefButton> button) override;
  
  // CefWindowDelegate methods:
  bool OnKeyEvent(CefRefPtr<CefWindow> window,
                 const CefKeyEvent& event) override;
  void OnWindowCreated(CefRefPtr<CefWindow> window) override;
  void OnWindowDestroyed(CefRefPtr<CefWindow> window) override;
  bool CanClose(CefRefPtr<CefWindow> window) override;
  CefSize GetPreferredSize(CefRefPtr<CefView> view) override;
  
 private:
  // Button IDs
  static const int ID_BACK_BUTTON = 1001;
  static const int ID_FORWARD_BUTTON = 1002;
  static const int ID_RELOAD_BUTTON = 1003;
  static const int ID_STOP_BUTTON = 1004;
  void BuildNavigationBar();
  void OnBackButtonPressed();
  void OnForwardButtonPressed();
  void OnReloadButtonPressed();
  void OnStopButtonPressed();
  void OnAddressBarEnter();
  void UpdateNavigationButtons();
  
  CefRefPtr<CefBrowserView> browser_view_;
  CefRefPtr<CefWindow> window_;
  CefRefPtr<CefTextfield> address_bar_;
  CefRefPtr<CefButton> back_button_;
  CefRefPtr<CefButton> forward_button_;
  CefRefPtr<CefButton> reload_button_;
  CefRefPtr<CefButton> stop_button_;
  CefRefPtr<MainHandler> handler_;
  
  IMPLEMENT_REFCOUNTING(BrowserWindow);
  DISALLOW_COPY_AND_ASSIGN(BrowserWindow);
};

#endif  // CEF_OAUTH_BROWSER_WINDOW_H_
