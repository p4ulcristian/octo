#!/usr/bin/env python3

import webview
import threading
import time
import subprocess
import os
import json
from bottle import Bottle, request
import asyncio
import websockets
from concurrent.futures import ThreadPoolExecutor

class SplitTerminalBrowser:
    def __init__(self):
        self.app = Bottle()
        self.setup_routes()
        self.window = None
        self.browser_window = None
        self.clients = set()
        self.current_url = "https://www.google.com"
        
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
                        background: #1e1e1e;
                        color: #f0f0f0;
                    }
                    
                    .top-bar {
                        background: #2d2d2d;
                        color: white;
                        padding: 12px;
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        border-bottom: 2px solid #007acc;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    }
                    
                    .top-bar label {
                        font-weight: bold;
                        color: #007acc;
                    }
                    
                    .url-input {
                        flex: 1;
                        padding: 8px 15px;
                        border: 1px solid #444;
                        border-radius: 6px;
                        background: #1e1e1e;
                        color: white;
                        font-size: 14px;
                        transition: border-color 0.3s;
                    }
                    
                    .url-input:focus {
                        outline: none;
                        border-color: #007acc;
                        box-shadow: 0 0 5px rgba(0,122,204,0.3);
                    }
                    
                    .go-btn, .open-btn {
                        background: linear-gradient(135deg, #007acc, #005a9e);
                        color: white;
                        border: none;
                        padding: 8px 15px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: bold;
                        transition: all 0.3s;
                        margin-left: 5px;
                    }
                    
                    .go-btn:hover, .open-btn:hover { 
                        background: linear-gradient(135deg, #005a9e, #004080);
                        transform: translateY(-1px);
                    }
                    
                    .main-container {
                        display: flex;
                        flex: 1;
                        height: calc(100vh - 70px);
                    }
                    
                    .terminal-pane {
                        width: 100%;
                        background: #1e1e1e;
                        color: #f0f0f0;
                        display: flex;
                        flex-direction: column;
                    }
                    
                    .terminal-header {
                        background: #2d2d2d;
                        padding: 8px 15px;
                        border-bottom: 1px solid #444;
                        font-weight: bold;
                        color: #007acc;
                    }
                    
                    .terminal-output {
                        flex: 1;
                        padding: 15px;
                        overflow-y: auto;
                        font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
                        font-size: 13px;
                        line-height: 1.5;
                        white-space: pre-wrap;
                        word-wrap: break-word;
                        background: #1e1e1e;
                    }
                    
                    .terminal-input-container {
                        background: #2d2d2d;
                        padding: 10px 15px;
                        border-top: 1px solid #444;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    
                    .prompt {
                        color: #4CAF50;
                        font-weight: bold;
                    }
                    
                    .command-input {
                        flex: 1;
                        background: #1e1e1e;
                        border: 1px solid #444;
                        color: #f0f0f0;
                        font-family: inherit;
                        font-size: 13px;
                        padding: 6px 10px;
                        border-radius: 4px;
                    }
                    
                    .command-input:focus {
                        outline: none;
                        border-color: #007acc;
                    }
                    
                    .status-bar {
                        background: #2d2d2d;
                        padding: 4px 15px;
                        font-size: 12px;
                        color: #888;
                        border-top: 1px solid #444;
                        display: flex;
                        justify-content: space-between;
                    }
                    
                    .connected { color: #4CAF50; }
                    .disconnected { color: #f44336; }
                    
                    .browser-info {
                        color: #007acc;
                    }
                </style>
            </head>
            <body>
                <div class="top-bar">
                    <label>🌐 Browser URL:</label>
                    <input type="text" class="url-input" id="urlInput" 
                           placeholder="Enter URL (e.g., https://www.google.com)" 
                           value="https://www.google.com"
                           onkeydown="if(event.key==='Enter') openInBrowser()">
                    <button class="open-btn" onclick="openInBrowser()">Open in Browser Window</button>
                </div>
                
                <div class="main-container">
                    <div class="terminal-pane">
                        <div class="terminal-header">💻 Terminal (Full Screen Mode)</div>
                        <div class="terminal-output" id="terminalOutput">Welcome to the integrated terminal!
Type commands and press Enter to execute.
Browser URLs will open in a separate window to avoid iframe restrictions.

</div>
                        <div class="terminal-input-container">
                            <span class="prompt">$</span>
                            <input type="text" class="command-input" id="commandInput" 
                                   placeholder="Enter command..." 
                                   onkeydown="handleCommand(event)">
                        </div>
                    </div>
                </div>
                
                <div class="status-bar">
                    <span>Terminal Status: <span id="terminalStatus" class="disconnected">Connecting...</span></span>
                    <span class="browser-info">Browser opens in separate window for better compatibility</span>
                </div>
                
                <script>
                    let ws = null;
                    let reconnectAttempts = 0;
                    const maxReconnectAttempts = 5;
                    
                    function updateStatus(connected) {
                        const status = document.getElementById('terminalStatus');
                        if (connected) {
                            status.textContent = 'Connected';
                            status.className = 'connected';
                            reconnectAttempts = 0;
                        } else {
                            status.textContent = 'Disconnected';
                            status.className = 'disconnected';
                        }
                    }
                    
                    function connectWebSocket() {
                        if (reconnectAttempts >= maxReconnectAttempts) {
                            addToTerminal('Max reconnection attempts reached. Please refresh the page.\\n');
                            updateStatus(false);
                            return;
                        }
                        
                        try {
                            ws = new WebSocket('ws://localhost:8081');
                            
                            ws.onopen = function(event) {
                                console.log('WebSocket connected');
                                addToTerminal('🔗 Terminal connected successfully!\\n\\n');
                                updateStatus(true);
                            };
                            
                            ws.onmessage = function(event) {
                                addToTerminal(event.data);
                            };
                            
                            ws.onclose = function(event) {
                                console.log('WebSocket disconnected');
                                updateStatus(false);
                                reconnectAttempts++;
                                if (reconnectAttempts < maxReconnectAttempts) {
                                    addToTerminal('⚠️ Terminal disconnected. Attempting to reconnect...\\n');
                                    setTimeout(connectWebSocket, 2000 * reconnectAttempts);
                                }
                            };
                            
                            ws.onerror = function(error) {
                                console.error('WebSocket error:', error);
                                updateStatus(false);
                            };
                        } catch (error) {
                            console.error('Failed to create WebSocket:', error);
                            updateStatus(false);
                        }
                    }
                    
                    function addToTerminal(text) {
                        const output = document.getElementById('terminalOutput');
                        output.textContent += text;
                        output.scrollTop = output.scrollHeight;
                    }
                    
                    function handleCommand(event) {
                        if (event.key === 'Enter') {
                            const input = event.target;
                            const command = input.value.trim();
                            if (command) {
                                if (ws && ws.readyState === WebSocket.OPEN) {
                                    addToTerminal('$ ' + command + '\\n');
                                    ws.send(JSON.stringify({type: 'command', data: command}));
                                    input.value = '';
                                } else {
                                    addToTerminal('❌ Terminal not connected. Please wait for connection to be established.\\n');
                                }
                            }
                        }
                    }
                    
                    function openInBrowser() {
                        const urlInput = document.getElementById('urlInput');
                        let url = urlInput.value.trim();
                        if (!url) return;
                        
                        if (!url.startsWith('http://') && !url.startsWith('https://')) {
                            if (url.includes('.') && !url.includes(' ')) {
                                url = 'https://' + url;
                            } else {
                                url = 'https://www.google.com/search?q=' + encodeURIComponent(url);
                            }
                        }
                        
                        // Send command to Python to open browser window
                        if (ws && ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({type: 'browser', data: url}));
                            addToTerminal('🌐 Opening browser window: ' + url + '\\n');
                        }
                        
                        urlInput.value = url;
                    }
                    
                    window.onload = function() {
                        connectWebSocket();
                        document.getElementById('commandInput').focus();
                    };
                </script>
            </body>
            </html>
            '''
            
    async def websocket_handler(self, websocket):
        self.clients.add(websocket)
        print(f"WebSocket client connected. Total clients: {len(self.clients)}")
        
        try:
            await websocket.send("Terminal ready. Type 'help' for available commands.\\nType 'browser <url>' to open a browser window.\\n")
            
            async for message in websocket:
                try:
                    data = json.loads(message)
                    if data['type'] == 'command':
                        command = data['data']
                        await self.execute_command_async(websocket, command)
                    elif data['type'] == 'browser':
                        url = data['data']
                        await self.open_browser_window(websocket, url)
                except json.JSONDecodeError:
                    await websocket.send("Error: Invalid command format\\n")
                except Exception as e:
                    await websocket.send(f"Error processing command: {str(e)}\\n")
                    
        except websockets.exceptions.ConnectionClosed:
            pass
        except Exception as e:
            print(f"WebSocket error: {e}")
        finally:
            self.clients.discard(websocket)
            print(f"WebSocket client disconnected. Total clients: {len(self.clients)}")
            
    async def open_browser_window(self, websocket, url):
        """Open a new browser window with the specified URL"""
        try:
            self.current_url = url
            # Create a new browser window
            threading.Thread(target=self.create_browser_window, args=(url,)).start()
            await websocket.send(f"✅ Browser window opened: {url}\\n")
        except Exception as e:
            await websocket.send(f"❌ Error opening browser: {str(e)}\\n")
            
    def create_browser_window(self, url):
        """Create a separate browser window"""
        try:
            self.browser_window = webview.create_window(
                f'Browser - {url}',
                url,
                width=1200,
                height=800,
                min_size=(800, 600)
            )
            # This will be handled by the main webview event loop
        except Exception as e:
            print(f"Error creating browser window: {e}")
            
    async def execute_command_async(self, websocket, command):
        try:
            command = command.strip()
            
            if command == 'help':
                help_text = """Available commands:
• help - Show this help message
• clear - Clear the terminal screen  
• pwd - Show current directory
• ls - List directory contents
• cd <path> - Change directory
• echo <text> - Print text
• date - Show current date and time
• whoami - Show current user
• browser <url> - Open URL in browser window
• Any other shell command will be executed

"""
                await websocket.send(help_text)
                return
                
            if command == 'clear':
                await websocket.send("\\033[2J\\033[H")
                return
                
            if command.startswith('browser '):
                url = command[8:].strip()
                if not url.startswith('http://') and not url.startswith('https://'):
                    if url.includes('.') and not url.includes(' '):
                        url = 'https://' + url
                    else:
                        url = 'https://www.google.com/search?q=' + url.replace(' ', '+')
                await self.open_browser_window(websocket, url)
                return
                
            if command.startswith('cd '):
                try:
                    path = command[3:].strip()
                    if not path:
                        path = os.path.expanduser('~')
                    elif path == '..':
                        path = os.path.dirname(os.getcwd())
                    elif not os.path.isabs(path):
                        path = os.path.join(os.getcwd(), path)
                        
                    os.chdir(path)
                    await websocket.send(f"📁 Changed directory to: {os.getcwd()}\\n")
                except Exception as e:
                    await websocket.send(f"❌ cd: {str(e)}\\n")
                return
                
            # Execute other commands using subprocess
            loop = asyncio.get_event_loop()
            with ThreadPoolExecutor() as executor:
                result = await loop.run_in_executor(
                    executor,
                    self.run_subprocess,
                    command
                )
                
            if result:
                await websocket.send(result)
            else:
                await websocket.send(f"✅ Command '{command}' completed successfully\\n")
                
        except Exception as e:
            await websocket.send(f"❌ Error: {str(e)}\\n")
            
    def run_subprocess(self, command):
        try:
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
                output += f"⚠️ Error output:\\n{result.stderr}"
                
            return output if output else None
            
        except subprocess.TimeoutExpired:
            return "⏰ Command timed out after 30 seconds\\n"
        except Exception as e:
            return f"❌ Error executing command: {str(e)}\\n"
            
    def start_websocket_server(self):
        async def websocket_server():
            print("Starting WebSocket server on localhost:8081")
            async with websockets.serve(self.websocket_handler, "localhost", 8081):
                await asyncio.Future()  # run forever
                
        def run_websocket():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(websocket_server())
            except Exception as e:
                print(f"WebSocket server error: {e}")
                
        ws_thread = threading.Thread(target=run_websocket)
        ws_thread.daemon = True
        ws_thread.start()
        
    def start_server(self):
        def run_server():
            print("Starting HTTP server on localhost:8080")
            try:
                self.app.run(host='localhost', port=8080, quiet=True)
            except Exception as e:
                print(f"HTTP server error: {e}")
        
        server_thread = threading.Thread(target=run_server)
        server_thread.daemon = True
        server_thread.start()
        
    def create_window(self):
        self.start_server()
        self.start_websocket_server()
        time.sleep(2)  # Give servers time to start
        
        print("Creating terminal window...")
        self.window = webview.create_window(
            'Terminal & Browser Controller',
            'http://localhost:8080',
            width=1000,
            height=700,
            min_size=(800, 500)
        )
        print("Window created successfully!")
        
    def run(self):
        self.create_window()
        webview.start(debug=False)

if __name__ == '__main__':
    app = SplitTerminalBrowser()
    app.run()