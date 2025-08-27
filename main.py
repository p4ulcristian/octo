#!/usr/bin/env python3

import webview
import threading
import time
from bottle import Bottle, run, static_file, request
import os
import logging

logging.basicConfig(level=logging.DEBUG)

class ChromeBrowser:
    def __init__(self):
        self.app = Bottle()
        self.setup_routes()
        self.window = None
        self.current_url = "https://www.google.com"
        
    def setup_routes(self):
        @self.app.route('/')
        def index():
            return '''
            <!DOCTYPE html>
            <html>
            <head>
                <title>Chrome Browser</title>
                <style>
                    body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
                    .toolbar { 
                        background: #f1f3f4; 
                        padding: 8px; 
                        border-bottom: 1px solid #dadce0;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    .url-bar { 
                        flex: 1; 
                        padding: 6px 12px; 
                        border: 1px solid #dadce0; 
                        border-radius: 20px;
                        font-size: 14px;
                    }
                    .nav-btn {
                        background: #f8f9fa;
                        border: 1px solid #dadce0;
                        border-radius: 4px;
                        padding: 6px 12px;
                        cursor: pointer;
                        font-size: 14px;
                    }
                    .nav-btn:hover { background: #e8eaed; }
                    .nav-btn:disabled { 
                        background: #f8f9fa; 
                        color: #9aa0a6; 
                        cursor: not-allowed; 
                    }
                    .browser-frame { 
                        width: 100%; 
                        height: calc(100vh - 50px); 
                        border: none; 
                    }
                </style>
            </head>
            <body>
                <div class="toolbar">
                    <button class="nav-btn" onclick="goBack()" id="backBtn">‹ Back</button>
                    <button class="nav-btn" onclick="goForward()" id="forwardBtn">Forward ›</button>
                    <button class="nav-btn" onclick="refresh()">↻ Refresh</button>
                    <input type="text" class="url-bar" id="urlBar" placeholder="Enter URL or search..." 
                           onkeydown="if(event.key==='Enter') navigate()">
                    <button class="nav-btn" onclick="navigate()">Go</button>
                </div>
                <iframe id="browserFrame" class="browser-frame" src="about:blank"></iframe>
                
                <script>
                    let currentUrl = 'https://www.google.com';
                    let history = [];
                    let historyIndex = -1;
                    
                    function updateUrl(url) {
                        if (!url.startsWith('http://') && !url.startsWith('https://')) {
                            if (url.includes('.') && !url.includes(' ')) {
                                url = 'https://' + url;
                            } else {
                                url = 'https://www.google.com/search?q=' + encodeURIComponent(url);
                            }
                        }
                        return url;
                    }
                    
                    function navigate() {
                        const urlBar = document.getElementById('urlBar');
                        let url = urlBar.value.trim();
                        if (!url) return;
                        
                        url = updateUrl(url);
                        loadUrl(url);
                    }
                    
                    function loadUrl(url) {
                        const frame = document.getElementById('browserFrame');
                        const urlBar = document.getElementById('urlBar');
                        
                        // Add to history
                        if (historyIndex < history.length - 1) {
                            history = history.slice(0, historyIndex + 1);
                        }
                        history.push(url);
                        historyIndex = history.length - 1;
                        
                        frame.src = url;
                        urlBar.value = url;
                        currentUrl = url;
                        updateButtons();
                    }
                    
                    function goBack() {
                        if (historyIndex > 0) {
                            historyIndex--;
                            const url = history[historyIndex];
                            const frame = document.getElementById('browserFrame');
                            const urlBar = document.getElementById('urlBar');
                            frame.src = url;
                            urlBar.value = url;
                            updateButtons();
                        }
                    }
                    
                    function goForward() {
                        if (historyIndex < history.length - 1) {
                            historyIndex++;
                            const url = history[historyIndex];
                            const frame = document.getElementById('browserFrame');
                            const urlBar = document.getElementById('urlBar');
                            frame.src = url;
                            urlBar.value = url;
                            updateButtons();
                        }
                    }
                    
                    function refresh() {
                        const frame = document.getElementById('browserFrame');
                        frame.src = frame.src;
                    }
                    
                    function updateButtons() {
                        document.getElementById('backBtn').disabled = historyIndex <= 0;
                        document.getElementById('forwardBtn').disabled = historyIndex >= history.length - 1;
                    }
                    
                    // Initialize
                    window.onload = function() {
                        loadUrl('https://www.google.com');
                    };
                </script>
            </body>
            </html>
            '''
            
    def start_server(self):
        def run_server():
            print("Starting server on localhost:8080")
            try:
                self.app.run(host='localhost', port=8080, quiet=False)
            except Exception as e:
                print(f"Server error: {e}")
        
        server_thread = threading.Thread(target=run_server)
        server_thread.daemon = True
        server_thread.start()
        time.sleep(2)  # Give server more time to start
        print("Server should be running now")
        
    def create_window(self):
        self.start_server()
        
        print("Creating webview window...")
        self.window = webview.create_window(
            'Chrome Browser',
            'http://localhost:8080',
            width=1200,
            height=800,
            min_size=(800, 600)
        )
        print("Window created")
        
    def run(self):
        self.create_window()
        webview.start(debug=True)

if __name__ == '__main__':
    browser = ChromeBrowser()
    browser.run()