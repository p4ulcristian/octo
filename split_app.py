#!/usr/bin/env python3

import webview
import threading
import time
import subprocess
import os
import sys
import signal
import pty
import select
import json
from bottle import Bottle, request, static_file
import websockets
import asyncio
from threading import Thread
import queue

class SplitTerminalBrowser:
    def __init__(self):
        self.app = Bottle()
        self.setup_routes()
        self.window = None
        self.terminal_process = None
        self.websocket_server = None
        self.client_websocket = None
        self.command_queue = queue.Queue()
        self.master_fd = None
        self.slave_fd = None
        
    def setup_routes(self):
        @self.app.route('/')
        def index():
            return '''
            <!DOCTYPE html>
            <html>
            <head>
                <title>Terminal & Browser Split</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: 'Monaco', 'Menlo', monospace; 
                        height: 100vh; 
                        display: flex; 
                        flex-direction: column;
                    }
                    
                    .top-bar {
                        background: #2d2d2d;
                        color: white;
                        padding: 8px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        border-bottom: 1px solid #444;
                    }
                    
                    .url-input {
                        flex: 1;
                        padding: 6px 12px;
                        border: 1px solid #444;
                        border-radius: 4px;
                        background: #1e1e1e;
                        color: white;
                        font-size: 14px;
                    }
                    
                    .go-btn {
                        background: #007acc;
                        color: white;
                        border: none;
                        padding: 6px 16px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                    }
                    
                    .go-btn:hover { background: #005a9e; }
                    
                    .main-container {
                        display: flex;
                        flex: 1;
                        height: calc(100vh - 50px);
                    }
                    
                    .terminal-pane {
                        width: 50%;
                        background: #1e1e1e;
                        color: #f0f0f0;
                        padding: 10px;
                        overflow-y: auto;
                        font-family: 'Monaco', 'Menlo', monospace;
                        font-size: 12px;
                        line-height: 1.4;
                        position: relative;
                    }
                    
                    .browser-pane {
                        width: 50%;
                        border-left: 1px solid #444;
                        position: relative;
                    }
                    
                    .terminal-output {
                        white-space: pre-wrap;
                        word-wrap: break-word;
                        margin-bottom: 10px;
                    }
                    
                    .terminal-input {
                        display: flex;
                        align-items: center;
                        position: absolute;
                        bottom: 10px;
                        left: 10px;
                        right: 10px;
                    }
                    
                    .prompt {
                        color: #4CAF50;
                        margin-right: 8px;
                    }
                    
                    .command-input {
                        flex: 1;
                        background: transparent;
                        border: none;
                        color: #f0f0f0;
                        font-family: inherit;
                        font-size: inherit;
                        outline: none;
                    }
                    
                    .browser-frame {
                        width: 100%;
                        height: 100%;
                        border: none;
                    }
                    
                    .resize-handle {
                        width: 4px;
                        background: #444;
                        cursor: col-resize;
                        position: relative;
                    }
                    
                    .resize-handle:hover {
                        background: #666;
                    }
                </style>
            </head>
            <body>
                <div class="top-bar">
                    <label>URL:</label>
                    <input type="text" class="url-input" id="urlInput" 
                           placeholder="Enter URL..." 
                           value="https://www.google.com"
                           onkeydown="if(event.key==='Enter') loadUrl()">
                    <button class="go-btn" onclick="loadUrl()">Go</button>
                </div>
                
                <div class="main-container">
                    <div class="terminal-pane" id="terminalPane">
                        <div class="terminal-output" id="terminalOutput"></div>
                        <div class="terminal-input">
                            <span class="prompt">$ </span>
                            <input type="text" class="command-input" id="commandInput" 
                                   placeholder="Enter command..." 
                                   onkeydown="handleCommand(event)">
                        </div>
                    </div>
                    
                    <div class="resize-handle" onmousedown="startResize(event)"></div>
                    
                    <div class="browser-pane" id="browserPane">
                        <iframe class="browser-frame" id="browserFrame" src="https://www.google.com"></iframe>
                    </div>
                </div>
                
                <script>
                    let ws = null;
                    let isResizing = false;
                    
                    // WebSocket connection for terminal
                    function connectWebSocket() {
                        ws = new WebSocket('ws://localhost:8081');
                        
                        ws.onopen = function(event) {
                            console.log('WebSocket connected');
                            addToTerminal('Terminal connected.\\n');
                        };
                        
                        ws.onmessage = function(event) {
                            addToTerminal(event.data);
                        };
                        
                        ws.onclose = function(event) {
                            console.log('WebSocket disconnected');
                            addToTerminal('Terminal disconnected.\\n');
                            // Attempt to reconnect after 1 second
                            setTimeout(connectWebSocket, 1000);
                        };
                        
                        ws.onerror = function(error) {
                            console.error('WebSocket error:', error);
                        };
                    }
                    
                    function addToTerminal(text) {
                        const output = document.getElementById('terminalOutput');
                        output.textContent += text;
                        // Auto scroll to bottom
                        const terminalPane = document.getElementById('terminalPane');
                        terminalPane.scrollTop = terminalPane.scrollHeight;
                    }
                    
                    function handleCommand(event) {
                        if (event.key === 'Enter') {
                            const input = event.target;
                            const command = input.value.trim();
                            if (command && ws && ws.readyState === WebSocket.OPEN) {
                                // Show command in terminal
                                addToTerminal('$ ' + command + '\\n');
                                // Send command to server
                                ws.send(JSON.stringify({type: 'command', data: command}));
                                input.value = '';
                            }
                        }
                    }
                    
                    function loadUrl() {
                        const urlInput = document.getElementById('urlInput');
                        let url = urlInput.value.trim();
                        if (!url) return;
                        
                        // Add protocol if missing
                        if (!url.startsWith('http://') && !url.startsWith('https://')) {
                            url = 'https://' + url;
                        }
                        
                        const browserFrame = document.getElementById('browserFrame');
                        browserFrame.src = url;
                        urlInput.value = url;
                    }
                    
                    // Resizable panes
                    function startResize(event) {
                        isResizing = true;
                        document.addEventListener('mousemove', doResize);
                        document.addEventListener('mouseup', stopResize);
                        event.preventDefault();
                    }
                    
                    function doResize(event) {
                        if (!isResizing) return;
                        
                        const container = document.querySelector('.main-container');
                        const containerRect = container.getBoundingClientRect();
                        const percentage = ((event.clientX - containerRect.left) / containerRect.width) * 100;
                        
                        if (percentage > 20 && percentage < 80) {
                            document.getElementById('terminalPane').style.width = percentage + '%';
                            document.getElementById('browserPane').style.width = (100 - percentage) + '%';
                        }
                    }
                    
                    function stopResize() {
                        isResizing = false;
                        document.removeEventListener('mousemove', doResize);
                        document.removeEventListener('mouseup', stopResize);
                    }
                    
                    // Initialize
                    window.onload = function() {
                        connectWebSocket();
                        // Focus on command input
                        document.getElementById('commandInput').focus();
                    };
                </script>
            </body>
            </html>
            '''
        
        @self.app.route('/static/<filepath:path>')
        def serve_static(filepath):
            return static_file(filepath, root='./static')
            
    async def websocket_handler(self, websocket, path):
        self.client_websocket = websocket
        print("WebSocket client connected")
        
        try:
            async for message in websocket:
                data = json.loads(message)
                if data['type'] == 'command':
                    command = data['data']
                    self.execute_command(command)
        except websockets.exceptions.ConnectionClosed:
            print("WebSocket client disconnected")
        except Exception as e:
            print(f"WebSocket error: {e}")
        finally:
            self.client_websocket = None
            
    def execute_command(self, command):
        try:
            # Execute command and capture output
            if command.strip() == 'clear':
                # Handle clear command specially
                if self.client_websocket:
                    asyncio.run_coroutine_threadsafe(
                        self.client_websocket.send("\\033[2J\\033[H"), 
                        asyncio.get_event_loop()
                    )
                return
                
            # Change directory command
            if command.strip().startswith('cd '):
                try:
                    path = command.strip()[3:].strip()
                    if not path:
                        path = os.path.expanduser('~')
                    os.chdir(path)
                    cwd = os.getcwd()
                    self.send_to_websocket(f"Changed directory to: {cwd}\\n")
                except Exception as e:
                    self.send_to_websocket(f"cd: {str(e)}\\n")
                return
                
            # For other commands, use subprocess
            result = subprocess.run(
                command, 
                shell=True, 
                capture_output=True, 
                text=True,
                cwd=os.getcwd(),
                timeout=30
            )
            
            output = ""
            if result.stdout:
                output += result.stdout
            if result.stderr:
                output += result.stderr
            if not output:
                output = f"Command completed (exit code: {result.returncode})\\n"
                
            self.send_to_websocket(output)
            
        except subprocess.TimeoutExpired:
            self.send_to_websocket("Command timed out after 30 seconds\\n")
        except Exception as e:
            self.send_to_websocket(f"Error: {str(e)}\\n")
            
    def send_to_websocket(self, message):
        if self.client_websocket:
            try:
                # Find the event loop running in the websocket thread
                for thread in threading.enumerate():
                    if hasattr(thread, '_target') and 'run_websocket' in str(thread._target):
                        # We'll store the loop reference when we create it
                        pass
                # For now, we'll use a simpler approach with a queue
                self.message_queue = getattr(self, 'message_queue', queue.Queue())
                self.message_queue.put(message)
            except Exception as e:
                print(f"Error sending to websocket: {e}")
                
    def __init__(self):
        self.app = Bottle()
        self.setup_routes()
        self.window = None
        self.terminal_process = None
        self.websocket_server = None
        self.client_websocket = None
        self.command_queue = queue.Queue()
        self.message_queue = queue.Queue()  # For sending messages to websocket
        self.master_fd = None
        self.slave_fd = None
        self.websocket_loop = None
                
    def start_websocket_server(self):
        async def websocket_server():
            async with websockets.serve(self.websocket_handler, "localhost", 8081):
                print("WebSocket server started on port 8081")
                await asyncio.Future()  # run forever
                
        def run_websocket():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(websocket_server())
            
        ws_thread = Thread(target=run_websocket)
        ws_thread.daemon = True
        ws_thread.start()
        
    def start_server(self):
        def run_server():
            print("Starting HTTP server on localhost:8080")
            try:
                self.app.run(host='localhost', port=8080, quiet=False)
            except Exception as e:
                print(f"Server error: {e}")
        
        server_thread = threading.Thread(target=run_server)
        server_thread.daemon = True
        server_thread.start()
        time.sleep(2)
        print("HTTP server should be running now")
        
    def create_window(self):
        self.start_server()
        self.start_websocket_server()
        time.sleep(1)  # Give servers time to start
        
        print("Creating webview window...")
        self.window = webview.create_window(
            'Terminal & Browser Split',
            'http://localhost:8080',
            width=1400,
            height=900,
            min_size=(1000, 600)
        )
        print("Window created")
        
    def run(self):
        self.create_window()
        webview.start(debug=True)

if __name__ == '__main__':
    app = SplitTerminalBrowser()
    app.run()