#!/usr/bin/env python3

import webview
import threading
import time
from bottle import Bottle
import webbrowser

class SimpleBrowser:
    def __init__(self):
        self.window = None
        self.current_url = "https://www.google.com"
        
    def create_window(self):
        print("Creating browser window...")
        
        # Create the main browser window that loads the URL directly
        self.window = webview.create_window(
            'Chrome Browser',
            self.current_url,
            width=1200,
            height=800,
            min_size=(800, 600)
        )
        print("Window created")
        
    def run(self):
        self.create_window()
        webview.start(debug=True)

if __name__ == '__main__':
    browser = SimpleBrowser()
    browser.run()