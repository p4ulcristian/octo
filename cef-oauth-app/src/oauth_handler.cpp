#include "oauth_handler.h"

#include <iostream>
#include <regex>
#include <sstream>

#include "include/cef_parser.h"
#include "include/wrapper/cef_helpers.h"

OAuthHandler::OAuthHandler() {
  // Add common OAuth callback patterns by default
  ConfigureGoogleOAuth();
  ConfigureGitHubOAuth();
}

OAuthHandler::~OAuthHandler() {}

bool OAuthHandler::OnBeforeBrowse(CefRefPtr<CefBrowser> browser,
                                  CefRefPtr<CefFrame> frame,
                                  CefRefPtr<CefRequest> request,
                                  bool user_gesture,
                                  bool is_redirect) {
  CEF_REQUIRE_UI_THREAD();

  std::string url = request->GetURL();
  
  // Check if this is an OAuth callback URL
  if (IsCallbackUrl(url)) {
    HandleOAuthCallback(browser, url);
    
    // Close the OAuth popup window after a delay
    // For simplicity, just let the user close the popup manually in this example
    
    return true;  // Cancel navigation to callback URL
  }

  return false;  // Allow navigation
}

CefRefPtr<CefResourceRequestHandler> OAuthHandler::GetResourceRequestHandler(
    CefRefPtr<CefBrowser> browser,
    CefRefPtr<CefFrame> frame,
    CefRefPtr<CefRequest> request,
    bool is_navigation,
    bool is_download,
    const CefString& request_initiator,
    bool& disable_default_handling) {
  return nullptr;  // Use default handling
}

bool OAuthHandler::IsOAuthUrl(const std::string& url) {
  // Check if URL matches common OAuth providers
  return (url.find("accounts.google.com") != std::string::npos ||
          url.find("github.com/login/oauth") != std::string::npos ||
          url.find("oauth") != std::string::npos ||
          url.find("authorize") != std::string::npos);
}

void OAuthHandler::AddOAuthCallbackUrl(const std::string& callback_url) {
  oauth_callback_urls_.push_back(callback_url);
}

void OAuthHandler::SetOAuthCallback(
    std::function<void(const std::string&, const std::string&)> callback) {
  oauth_callback_ = callback;
}

void OAuthHandler::ConfigureGoogleOAuth() {
  oauth_patterns_.push_back(".*://localhost.*");
  oauth_patterns_.push_back(".*://127\\.0\\.0\\.1.*");
  oauth_patterns_.push_back(".*://.*\\.googleusercontent\\.com.*");
  oauth_callback_urls_.push_back("http://localhost");
  oauth_callback_urls_.push_back("https://localhost");
}

void OAuthHandler::ConfigureGitHubOAuth() {
  oauth_patterns_.push_back(".*://localhost.*");
  oauth_patterns_.push_back(".*://127\\.0\\.0\\.1.*");
  oauth_callback_urls_.push_back("http://localhost");
  oauth_callback_urls_.push_back("https://localhost");
}

void OAuthHandler::ConfigureCustomOAuth(const std::string& callback_pattern) {
  oauth_patterns_.push_back(callback_pattern);
}

bool OAuthHandler::IsCallbackUrl(const std::string& url) {
  // Check exact callback URLs
  for (const auto& callback_url : oauth_callback_urls_) {
    if (url.substr(0, callback_url.length()) == callback_url) {
      return true;
    }
  }

  // Check patterns with simple string matching
  for (const auto& pattern : oauth_patterns_) {
    // Simple string matching for localhost patterns
    if (pattern.find("localhost") != std::string::npos && url.find("localhost") != std::string::npos) {
      return true;
    }
    if (pattern.find("127.0.0.1") != std::string::npos && url.find("127.0.0.1") != std::string::npos) {
      return true;
    }
  }

  return false;
}

void OAuthHandler::HandleOAuthCallback(CefRefPtr<CefBrowser> browser, 
                                       const std::string& url) {
  std::cout << "OAuth callback intercepted: " << url << std::endl;

  std::string auth_code = ExtractAuthorizationCode(url);
  std::string error = ExtractErrorFromUrl(url);

  if (oauth_callback_) {
    oauth_callback_(auth_code, error);
  } else {
    // Default handling - just log the results
    if (!auth_code.empty()) {
      std::cout << "Authorization code extracted: " << auth_code << std::endl;
    }
    if (!error.empty()) {
      std::cout << "OAuth error: " << error << std::endl;
    }
  }

  // Show a success/error page
  std::stringstream html;
  html << "<html><head><title>OAuth Result</title></head><body>";
  html << "<div style='text-align: center; font-family: Arial, sans-serif; padding: 50px;'>";
  
  if (!auth_code.empty()) {
    html << "<h2 style='color: green;'>✓ Authorization Successful</h2>";
    html << "<p>You can now close this window.</p>";
    html << "<p><small>Authorization code: " << auth_code.substr(0, 20) << "...</small></p>";
  } else if (!error.empty()) {
    html << "<h2 style='color: red;'>✗ Authorization Failed</h2>";
    html << "<p>Error: " << error << "</p>";
  } else {
    html << "<h2>OAuth Callback Processed</h2>";
    html << "<p>The callback was intercepted and processed.</p>";
  }
  
  html << "</div></body></html>";

  // Load the result page
  std::string data_url = "data:text/html;charset=utf-8;base64," +
                         CefBase64Encode(html.str().data(), html.str().size()).ToString();
  browser->GetMainFrame()->LoadURL(data_url);
}

std::string OAuthHandler::ExtractAuthorizationCode(const std::string& url) {
  // Parse URL to extract authorization code
  CefURLParts url_parts;
  if (CefParseURL(url, url_parts)) {
    std::string query = CefString(&url_parts.query).ToString();
    
    // Simple string search for code parameter
    size_t code_pos = query.find("code=");
    if (code_pos != std::string::npos) {
      size_t start = code_pos + 5; // length of "code="
      size_t end = query.find("&", start);
      if (end == std::string::npos) end = query.length();
      std::string code_value = query.substr(start, end - start);
      return CefURIDecode(code_value, true, cef_uri_unescape_rule_t::UU_SPACES).ToString();
    }
  }
  return "";
}

std::string OAuthHandler::ExtractErrorFromUrl(const std::string& url) {
  // Parse URL to extract error parameter
  CefURLParts url_parts;
  if (CefParseURL(url, url_parts)) {
    std::string query = CefString(&url_parts.query).ToString();
    
    // Simple string search for error parameter
    size_t error_pos = query.find("error=");
    if (error_pos != std::string::npos) {
      size_t start = error_pos + 6; // length of "error="
      size_t end = query.find("&", start);
      if (end == std::string::npos) end = query.length();
      std::string error_value = query.substr(start, end - start);
      return CefURIDecode(error_value, true, cef_uri_unescape_rule_t::UU_SPACES).ToString();
    }
  }
  return "";
}
