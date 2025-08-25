#ifndef CEF_OAUTH_NATIVE_WINDOW_MAC_H_
#define CEF_OAUTH_NATIVE_WINDOW_MAC_H_

#import <Cocoa/Cocoa.h>
#include "include/cef_app.h"
#include "main_handler.h"

// Native macOS window controller for dual browser layout with resizable divider
@interface DualBrowserWindowController : NSWindowController <NSSplitViewDelegate> {
@private
  CefRefPtr<MainHandler> handler_;
  CefRefPtr<CefBrowser> left_browser_;
  CefRefPtr<CefBrowser> right_browser_;
  NSView* left_browser_view_;
  NSView* right_browser_view_;
  NSSplitView* split_view_;
}

- (id)initWithHandler:(CefRefPtr<MainHandler>)handler;
- (void)createDualBrowserWindow;
- (void)loadLeftURL:(NSString*)leftURL rightURL:(NSString*)rightURL;
- (void)setBrowsers:(CefRefPtr<CefBrowser>)leftBrowser 
       rightBrowser:(CefRefPtr<CefBrowser>)rightBrowser;

@end

// C++ interface for creating the native window
class NativeMacWindow {
public:
  static void CreateDualBrowserWindow(CefRefPtr<MainHandler> handler);
};

#endif  // CEF_OAUTH_NATIVE_WINDOW_MAC_H_
