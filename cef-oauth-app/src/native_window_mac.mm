#import "native_window_mac.h"
#include "include/cef_browser.h"
#include "include/wrapper/cef_helpers.h"

@implementation DualBrowserWindowController

- (id)initWithHandler:(CefRefPtr<MainHandler>)handler {
    self = [super init];
    if (self) {
        handler_ = handler;
    }
    return self;
}

- (void)createDualBrowserWindow {
    // Create the main window
    NSRect windowFrame = NSMakeRect(100, 100, 1400, 800);
    NSWindow* window = [[NSWindow alloc] 
        initWithContentRect:windowFrame
                  styleMask:NSWindowStyleMaskTitled | 
                           NSWindowStyleMaskClosable |
                           NSWindowStyleMaskMiniaturizable |
                           NSWindowStyleMaskResizable
                    backing:NSBackingStoreBuffered
                      defer:NO];
    
    [window setTitle:@"CEF OAuth Browser - Resizable Split View"];
    [window setDelegate:(id<NSWindowDelegate>)self];
    
    // Create the main content view
    NSView* contentView = [window contentView];
    
    // Create an NSSplitView for resizable divider
    split_view_ = [[NSSplitView alloc] initWithFrame:[contentView bounds]];
    [split_view_ setVertical:YES];  // Vertical split (left/right panes)
    [split_view_ setDividerStyle:NSSplitViewDividerStyleThin];
    [split_view_ setDelegate:(id<NSSplitViewDelegate>)self];
    [split_view_ setAutoresizingMask:NSViewWidthSizable | NSViewHeightSizable];
    
    // Create left browser view container
    left_browser_view_ = [[NSView alloc] initWithFrame:NSMakeRect(0, 0, 700, 800)];
    [left_browser_view_ setAutoresizingMask:NSViewWidthSizable | NSViewHeightSizable];
    
    // Create right browser view container  
    right_browser_view_ = [[NSView alloc] initWithFrame:NSMakeRect(0, 0, 700, 800)];
    [right_browser_view_ setAutoresizingMask:NSViewWidthSizable | NSViewHeightSizable];
    
    // Add both views to split view
    [split_view_ addSubview:left_browser_view_];
    [split_view_ addSubview:right_browser_view_];
    
    // Add split view to content view
    [contentView addSubview:split_view_];
    
    // Set window and show
    self.window = window;
    [window makeKeyAndOrderFront:nil];
    [window center];
    
    printf("Created resizable split view window\n");
    
    // Create CEF browsers after window is shown
    [self performSelector:@selector(createCEFBrowsers) 
               withObject:nil 
               afterDelay:0.1];
}

- (void)createCEFBrowsers {
    // Create LEFT CEF browser (Google)
    CefWindowInfo left_window_info;
    NSRect leftBounds = [left_browser_view_ bounds];
    CefRect leftCefBounds(leftBounds.origin.x, leftBounds.origin.y,
                         leftBounds.size.width, leftBounds.size.height);
    left_window_info.SetAsChild(left_browser_view_, leftCefBounds);
    
    CefBrowserSettings left_settings;
    CefBrowserHost::CreateBrowser(left_window_info, handler_, 
                                 "https://www.google.com", 
                                 left_settings, nullptr, nullptr);
    
    // Create RIGHT CEF browser (YouTube)
    CefWindowInfo right_window_info;
    NSRect rightBounds = [right_browser_view_ bounds];
    CefRect rightCefBounds(rightBounds.origin.x, rightBounds.origin.y,
                          rightBounds.size.width, rightBounds.size.height);
    right_window_info.SetAsChild(right_browser_view_, rightCefBounds);
    
    CefBrowserSettings right_settings;
    CefBrowserHost::CreateBrowser(right_window_info, handler_,
                                 "https://www.youtube.com",
                                 right_settings, nullptr, nullptr);
    
    printf("Created dual CEF browsers in native macOS window\n");
}

- (void)loadLeftURL:(NSString*)leftURL rightURL:(NSString*)rightURL {
    if (left_browser_) {
        left_browser_->GetMainFrame()->LoadURL([leftURL UTF8String]);
    }
    if (right_browser_) {
        right_browser_->GetMainFrame()->LoadURL([rightURL UTF8String]);
    }
}

// Method to store browser references when they are created
- (void)setBrowsers:(CefRefPtr<CefBrowser>)leftBrowser 
       rightBrowser:(CefRefPtr<CefBrowser>)rightBrowser {
    left_browser_ = leftBrowser;
    right_browser_ = rightBrowser;
    printf("Browser references stored for resizing\n");
}

// NSSplitViewDelegate methods for resizable divider
- (BOOL)splitView:(NSSplitView*)splitView canCollapseSubview:(NSView*)subview {
    return NO; // Prevent collapsing panes completely
}

- (CGFloat)splitView:(NSSplitView*)splitView constrainMinCoordinate:(CGFloat)proposedMin 
          ofSubviewAt:(NSInteger)dividerIndex {
    return 200.0; // Minimum width for left pane
}

- (CGFloat)splitView:(NSSplitView*)splitView constrainMaxCoordinate:(CGFloat)proposedMax 
          ofSubviewAt:(NSInteger)dividerIndex {
    return [splitView frame].size.width - 200.0; // Minimum width for right pane
}

- (void)splitViewDidResizeSubviews:(NSNotification*)notification {
    // Called when the user drags the divider - resize CEF browsers
    if (left_browser_ && right_browser_) {
        // Tell CEF browsers to resize
        left_browser_->GetHost()->WasResized();
        right_browser_->GetHost()->WasResized();
        
        printf("Split view resized - CEF browsers updated\n");
    }
}

// Window delegate methods
- (void)windowWillClose:(NSNotification*)notification {
    if (left_browser_) {
        left_browser_->GetHost()->CloseBrowser(false);
    }
    if (right_browser_) {
        right_browser_->GetHost()->CloseBrowser(false);
    }
}

@end

// C++ interface implementation
void NativeMacWindow::CreateDualBrowserWindow(CefRefPtr<MainHandler> handler) {
    CEF_REQUIRE_UI_THREAD();
    
    DualBrowserWindowController* controller = 
        [[DualBrowserWindowController alloc] initWithHandler:handler];
    [controller createDualBrowserWindow];
}
