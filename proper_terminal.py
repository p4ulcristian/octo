#!/usr/bin/env python3

import sys
import os
import pty
import select
import subprocess
import threading
import json
import asyncio
import websockets
from PyQt6.QtWidgets import (QApplication, QMainWindow, QWidget, QHBoxLayout, 
                             QVBoxLayout, QLineEdit, QLabel, QPushButton, 
                             QSplitter, QFrame)
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtCore import Qt, QUrl
from bottle import Bottle

class ProperTerminal:
    def __init__(self):
        self.app = Bottle()
        self.setup_routes()
        self.clients = set()
        self.shell_process = None
        self.master_fd = None
        self.slave_fd = None
        self.setup_pty()
        
    def setup_routes(self):
        @self.app.route('/')
        def terminal_page():
            return '''
            <!DOCTYPE html>
            <html>
            <head>
                <title>Real Terminal</title>
                <script src="https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/@xterm/addon-fit@0.10.0/lib/addon-fit.min.js"></script>
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css">
                <style>
                    body { 
                        margin: 0; 
                        padding: 10px; 
                        background: #1e1e1e; 
                        font-family: monospace;
                    }
                    .terminal-container { 
                        width: 100%; 
                        height: calc(100vh - 20px); 
                        border: 1px solid #333;
                    }
                    .header {
                        background: #2d2d2d;
                        color: #007acc;
                        padding: 10px;
                        font-weight: bold;
                        border-bottom: 1px solid #444;
                    }
                </style>
            </head>
            <body>
                <div class="header">💻 Real PTY Terminal (xterm.js)</div>
                <div class="terminal-container" id="terminal"></div>
                
                <script>
                    // Create xterm.js terminal
                    const { Terminal } = window;
                    const { FitAddon } = window.FitAddon || {};
                    
                    const terminal = new Terminal({
                        cursorBlink: true,
                        fontSize: 14,
                        fontFamily: 'Monaco, Menlo, "Courier New", monospace',
                        theme: {
                            background: '#1e1e1e',
                            foreground: '#f0f0f0',
                            cursor: '#f0f0f0',
                            selection: '#44475a',
                            black: '#000000',
                            red: '#ff5555',
                            green: '#50fa7b',
                            yellow: '#f1fa8c',
                            blue: '#bd93f9',
                            magenta: '#ff79c6',
                            cyan: '#8be9fd',
                            white: '#bbbbbb',
                            brightBlack: '#555555',
                            brightRed: '#ff6e67',
                            brightGreen: '#5af78e',
                            brightYellow: '#f4f99d',
                            brightBlue: '#caa9fa',
                            brightMagenta: '#ff92d0',
                            brightCyan: '#9aedfe',
                            brightWhite: '#ffffff'
                        }
                    });
                    
                    // Add fit addon if available
                    const fitAddon = FitAddon ? new FitAddon() : null;
                    if (fitAddon) {
                        terminal.loadAddon(fitAddon);
                    }
                    
                    // Open terminal in container
                    terminal.open(document.getElementById('terminal'));
                    
                    // WebSocket connection
                    const ws = new WebSocket('ws://localhost:8081');
                    
                    ws.onopen = function() {
                        terminal.writeln('\\x1b[32m✓ Terminal connected!\\x1b[0m');
                    };
                    
                    ws.onmessage = function(event) {
                        // Write data from PTY to terminal
                        terminal.write(event.data);
                    };
                    
                    ws.onclose = function() {
                        terminal.writeln('\\r\\n\\x1b[31m✗ Terminal disconnected\\x1b[0m');
                    };
                    
                    // Send terminal input to PTY
                    terminal.onData(function(data) {
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(data);
                        }
                    });
                    
                    // Handle terminal resize
                    terminal.onResize(function(size) {
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({
                                type: 'resize',
                                cols: size.cols,
                                rows: size.rows
                            }));
                        }
                    });
                    
                    // Fit terminal to container
                    window.addEventListener('resize', function() {
                        if (fitAddon) fitAddon.fit();
                    });
                    
                    // Initial fit
                    setTimeout(function() {
                        if (fitAddon) fitAddon.fit();
                        terminal.focus();
                    }, 100);
                </script>
            </body>
            </html>
            '''
    
    def setup_pty(self):
        """Create PTY and shell process"""
        try:
            # Create PTY
            self.master_fd, self.slave_fd = pty.openpty()
            
            # Start shell
            shell = os.environ.get('SHELL', '/bin/bash')
            env = os.environ.copy()
            env['TERM'] = 'xterm-256color'
            
            self.shell_process = subprocess.Popen(
                [shell, '-l'],  # Login shell
                stdin=self.slave_fd,
                stdout=self.slave_fd,
                stderr=self.slave_fd,
                env=env,
                cwd=os.getcwd(),
                preexec_fn=os.setsid
            )
            
            # Start PTY reader thread
            self.pty_thread = threading.Thread(target=self.read_pty, daemon=True)
            self.pty_thread.start()
            
            print(f"PTY created with shell: {shell}")
            
        except Exception as e:
            print(f"Failed to create PTY: {e}")
    
    def read_pty(self):
        """Read from PTY and send to WebSocket clients"""
        while True:
            try:
                # Wait for data from PTY
                ready, _, _ = select.select([self.master_fd], [], [], 1.0)
                if ready:
                    data = os.read(self.master_fd, 8192)
                    if data:
                        # Send to all connected clients
                        text = data.decode('utf-8', errors='replace')
                        self.broadcast_to_clients(text)
                    else:
                        break
            except OSError:
                break
            except Exception as e:
                print(f"PTY read error: {e}")
                break
    
    def broadcast_to_clients(self, data):
        """Send data to all WebSocket clients"""
        if not self.clients:
            return
            
        # Use asyncio to send to clients
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        async def send_data():
            if self.clients:
                # Send to all clients
                tasks = []
                for client in self.clients.copy():
                    try:
                        tasks.append(client.send(data))
                    except:
                        self.clients.discard(client)
                        
                if tasks:
                    await asyncio.gather(*tasks, return_exceptions=True)
        
        try:
            loop.run_until_complete(send_data())
        except:
            pass
        finally:
            loop.close()
    
    async def websocket_handler(self, websocket):
        """Handle WebSocket connections"""
        self.clients.add(websocket)
        print(f"Terminal client connected. Total: {len(self.clients)}")
        
        try:
            async for message in websocket:
                if isinstance(message, str):
                    try:
                        # Try to parse as JSON (for resize commands)
                        data = json.loads(message)
                        if data.get('type') == 'resize':
                            self.resize_pty(data['rows'], data['cols'])
                    except json.JSONDecodeError:
                        # Regular terminal input
                        if self.master_fd:
                            os.write(self.master_fd, message.encode('utf-8'))
                else:
                    # Binary data - send directly to PTY
                    if self.master_fd:
                        os.write(self.master_fd, message)
                        
        except websockets.exceptions.ConnectionClosed:
            pass
        except Exception as e:
            print(f"WebSocket error: {e}")
        finally:
            self.clients.discard(websocket)
            print(f"Terminal client disconnected. Total: {len(self.clients)}")
    
    def resize_pty(self, rows, cols):
        """Resize PTY"""
        try:
            import struct, fcntl, termios
            winsize = struct.pack('HHHH', rows, cols, 0, 0)
            fcntl.ioctl(self.master_fd, termios.TIOCSWINSZ, winsize)
        except Exception as e:
            print(f"Resize error: {e}")
    
    def start_websocket_server(self):
        """Start WebSocket server"""
        async def server():
            async with websockets.serve(self.websocket_handler, "localhost", 8081):
                print("Terminal WebSocket server started on port 8081")
                await asyncio.Future()  # Run forever
        
        def run_server():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(server())
        
        ws_thread = threading.Thread(target=run_server, daemon=True)
        ws_thread.start()
    
    def start_http_server(self):
        """Start HTTP server"""
        def run_http():
            self.app.run(host='localhost', port=8080, quiet=True)
        
        http_thread = threading.Thread(target=run_http, daemon=True)
        http_thread.start()
    
    def start_servers(self):
        """Start both servers"""
        self.start_http_server()
        self.start_websocket_server()

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.terminal_server = ProperTerminal()
        self.init_ui()
        
    def init_ui(self):
        self.setWindowTitle("Proper Terminal + Browser")
        self.setGeometry(100, 100, 1400, 900)
        
        self.setStyleSheet("""
            QMainWindow { background-color: #1e1e1e; }
            QWidget { background-color: #1e1e1e; color: white; }
            QLineEdit { 
                background-color: #333; 
                color: white; 
                border: 1px solid #666;
                padding: 8px;
                font-size: 14px;
            }
            QPushButton {
                background-color: #007acc;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                font-weight: bold;
            }
            QPushButton:hover { background-color: #005a9e; }
            QLabel { color: #007acc; font-weight: bold; }
        """)
        
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        layout = QVBoxLayout(central_widget)
        layout.setContentsMargins(0, 0, 0, 0)
        
        # URL bar
        url_frame = QFrame()
        url_frame.setFixedHeight(50)
        url_frame.setStyleSheet("background-color: #2d2d2d; border-bottom: 2px solid #007acc;")
        url_layout = QHBoxLayout(url_frame)
        
        url_layout.addWidget(QLabel("🌐 Browser URL:"))
        self.url_input = QLineEdit("https://www.google.com")
        self.url_input.returnPressed.connect(self.load_url)
        url_layout.addWidget(self.url_input)
        
        go_btn = QPushButton("Go")
        go_btn.clicked.connect(self.load_url)
        url_layout.addWidget(go_btn)
        
        layout.addWidget(url_frame)
        
        # Splitter
        splitter = QSplitter(Qt.Orientation.Horizontal)
        layout.addWidget(splitter)
        
        # Terminal WebView (loads xterm.js)
        self.terminal_view = QWebEngineView()
        self.terminal_view.setUrl(QUrl("http://localhost:8080"))
        splitter.addWidget(self.terminal_view)
        
        # Browser WebView
        self.browser_view = QWebEngineView()
        self.browser_view.setUrl(QUrl("https://www.google.com"))
        splitter.addWidget(self.browser_view)
        
        # Equal split
        splitter.setSizes([700, 700])
        
        # Start terminal servers
        self.terminal_server.start_servers()
        
    def load_url(self):
        url = self.url_input.text().strip()
        if not url.startswith(('http://', 'https://')):
            if '.' in url and ' ' not in url:
                url = 'https://' + url
            else:
                url = f"https://www.google.com/search?q={url.replace(' ', '+')}"
        
        self.browser_view.setUrl(QUrl(url))
        self.url_input.setText(url)

def main():
    app = QApplication(sys.argv)
    
    # Give servers time to start
    import time
    
    window = MainWindow()
    window.show()
    
    # Wait a bit for servers to start, then reload terminal
    def reload_terminal():
        window.terminal_view.reload()
        
    from PyQt6.QtCore import QTimer
    QTimer.singleShot(2000, reload_terminal)
    
    sys.exit(app.exec())

if __name__ == '__main__':
    main()