#!/usr/bin/env python3

import sys
import os
import subprocess
import threading
import queue
from PyQt6.QtWidgets import (QApplication, QMainWindow, QWidget, QHBoxLayout, 
                             QVBoxLayout, QTextEdit, QLineEdit, QLabel, 
                             QPushButton, QSplitter, QFrame)
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtCore import Qt, QThread, pyqtSignal, QTimer, QUrl
from PyQt6.QtGui import QFont, QPalette, QColor

class TerminalWorker(QThread):
    output_ready = pyqtSignal(str)
    
    def __init__(self, command_queue):
        super().__init__()
        self.command_queue = command_queue
        self.current_dir = os.getcwd()
        
    def run(self):
        while True:
            try:
                command = self.command_queue.get(timeout=0.1)
                if command is None:  # Shutdown signal
                    break
                self.execute_command(command)
            except queue.Empty:
                continue
                
    def execute_command(self, command):
        try:
            command = command.strip()
            
            if command == 'clear':
                self.output_ready.emit('\\033[2J\\033[H')
                return
                
            if command.startswith('cd '):
                try:
                    path = command[3:].strip()
                    if not path:
                        path = os.path.expanduser('~')
                    elif path == '..':
                        path = os.path.dirname(self.current_dir)
                    elif not os.path.isabs(path):
                        path = os.path.join(self.current_dir, path)
                        
                    if os.path.exists(path) and os.path.isdir(path):
                        self.current_dir = path
                        os.chdir(path)
                        self.output_ready.emit(f"📁 Changed directory to: {self.current_dir}\\n")
                    else:
                        self.output_ready.emit(f"❌ cd: {path}: No such file or directory\\n")
                except Exception as e:
                    self.output_ready.emit(f"❌ cd: {str(e)}\\n")
                return
                
            # Execute other commands
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                cwd=self.current_dir,
                timeout=30
            )
            
            output = ""
            if result.stdout:
                output += result.stdout
            if result.stderr:
                output += f"⚠️ Error: {result.stderr}"
                
            if output:
                self.output_ready.emit(output)
            else:
                self.output_ready.emit(f"✅ Command '{command}' completed (exit code: {result.returncode})\\n")
                
        except subprocess.TimeoutExpired:
            self.output_ready.emit("⏰ Command timed out after 30 seconds\\n")
        except Exception as e:
            self.output_ready.emit(f"❌ Error: {str(e)}\\n")

class CEFTerminalBrowser(QMainWindow):
    def __init__(self):
        super().__init__()
        self.command_queue = queue.Queue()
        self.init_ui()
        self.init_terminal()
        
    def init_ui(self):
        self.setWindowTitle("CEF Terminal & Browser Split")
        self.setGeometry(100, 100, 1400, 900)
        
        # Set dark theme
        self.setStyleSheet("""
            QMainWindow {
                background-color: #1e1e1e;
                color: #f0f0f0;
            }
            QWidget {
                background-color: #1e1e1e;
                color: #f0f0f0;
            }
            QTextEdit {
                background-color: #1e1e1e;
                color: #f0f0f0;
                font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
                font-size: 13px;
                border: 1px solid #444;
            }
            QLineEdit {
                background-color: #2d2d2d;
                color: #f0f0f0;
                font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
                font-size: 13px;
                border: 1px solid #444;
                padding: 6px;
                border-radius: 4px;
            }
            QLineEdit:focus {
                border: 1px solid #007acc;
            }
            QPushButton {
                background-color: #007acc;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #005a9e;
            }
            QLabel {
                color: #007acc;
                font-weight: bold;
            }
            QFrame {
                background-color: #2d2d2d;
            }
        """)
        
        # Central widget
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # Main layout
        main_layout = QVBoxLayout(central_widget)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)
        
        # Top bar for browser URL
        self.create_top_bar(main_layout)
        
        # Splitter for terminal and browser
        splitter = QSplitter(Qt.Orientation.Horizontal)
        main_layout.addWidget(splitter)
        
        # Terminal panel
        self.create_terminal_panel(splitter)
        
        # Browser panel
        self.create_browser_panel(splitter)
        
        # Set splitter proportions (50/50)
        splitter.setSizes([700, 700])
        
        # Status bar
        self.statusBar().showMessage("Terminal: Ready | Browser: CEF WebEngine")
        self.statusBar().setStyleSheet("background-color: #2d2d2d; color: #888;")
        
    def create_top_bar(self, layout):
        top_frame = QFrame()
        top_frame.setFixedHeight(50)
        top_frame.setStyleSheet("background-color: #2d2d2d; border-bottom: 2px solid #007acc;")
        layout.addWidget(top_frame)
        
        top_layout = QHBoxLayout(top_frame)
        top_layout.setContentsMargins(12, 8, 12, 8)
        
        url_label = QLabel("🌐 Browser URL:")
        top_layout.addWidget(url_label)
        
        self.url_input = QLineEdit()
        self.url_input.setPlaceholderText("Enter URL (e.g., https://www.google.com)")
        self.url_input.setText("https://www.google.com")
        self.url_input.returnPressed.connect(self.load_url)
        top_layout.addWidget(self.url_input)
        
        go_button = QPushButton("Go")
        go_button.clicked.connect(self.load_url)
        top_layout.addWidget(go_button)
        
    def create_terminal_panel(self, parent):
        terminal_frame = QFrame()
        terminal_layout = QVBoxLayout(terminal_frame)
        terminal_layout.setContentsMargins(0, 0, 0, 0)
        terminal_layout.setSpacing(0)
        
        # Terminal header
        header_frame = QFrame()
        header_frame.setFixedHeight(30)
        header_frame.setStyleSheet("background-color: #2d2d2d; border-bottom: 1px solid #444;")
        header_layout = QHBoxLayout(header_frame)
        header_layout.setContentsMargins(10, 5, 10, 5)
        
        terminal_label = QLabel("💻 Terminal")
        header_layout.addWidget(terminal_label)
        terminal_layout.addWidget(header_frame)
        
        # Terminal output
        self.terminal_output = QTextEdit()
        self.terminal_output.setReadOnly(True)
        font = QFont('Monaco', 12)
        font.setFamily('Monaco, Menlo, Courier New, monospace')
        self.terminal_output.setFont(font)
        terminal_layout.addWidget(self.terminal_output)
        
        # Terminal input
        input_frame = QFrame()
        input_frame.setFixedHeight(40)
        input_frame.setStyleSheet("background-color: #2d2d2d; border-top: 1px solid #444;")
        input_layout = QHBoxLayout(input_frame)
        input_layout.setContentsMargins(10, 8, 10, 8)
        
        prompt_label = QLabel("$")
        prompt_label.setStyleSheet("color: #4CAF50; font-weight: bold;")
        input_layout.addWidget(prompt_label)
        
        self.command_input = QLineEdit()
        self.command_input.setPlaceholderText("Enter command...")
        self.command_input.returnPressed.connect(self.execute_command)
        input_layout.addWidget(self.command_input)
        
        terminal_layout.addWidget(input_frame)
        parent.addWidget(terminal_frame)
        
        # Add initial welcome message
        welcome_msg = """Welcome to CEF Terminal & Browser!
Using Chromium Embedded Framework via PyQt6 WebEngine.

Type commands and press Enter to execute.
Available commands:
• help - Show help
• clear - Clear terminal
• cd <path> - Change directory
• ls, pwd, date, whoami, etc. - Standard shell commands

"""
        self.terminal_output.append(welcome_msg)
        
    def create_browser_panel(self, parent):
        browser_frame = QFrame()
        browser_layout = QVBoxLayout(browser_frame)
        browser_layout.setContentsMargins(0, 0, 0, 0)
        browser_layout.setSpacing(0)
        
        # Browser header
        header_frame = QFrame()
        header_frame.setFixedHeight(30)
        header_frame.setStyleSheet("background-color: #2d2d2d; border-bottom: 1px solid #444;")
        header_layout = QHBoxLayout(header_frame)
        header_layout.setContentsMargins(10, 5, 10, 5)
        
        browser_label = QLabel("🌐 Chromium Browser (CEF)")
        browser_label.setStyleSheet("color: white;")
        header_layout.addWidget(browser_label)
        browser_layout.addWidget(header_frame)
        
        # CEF WebEngine browser
        self.browser = QWebEngineView()
        self.browser.setUrl(QUrl("https://www.google.com"))
        browser_layout.addWidget(self.browser)
        
        parent.addWidget(browser_frame)
        
    def init_terminal(self):
        # Start terminal worker thread
        self.terminal_worker = TerminalWorker(self.command_queue)
        self.terminal_worker.output_ready.connect(self.append_terminal_output)
        self.terminal_worker.start()
        
        # Focus on command input
        self.command_input.setFocus()
        
    def execute_command(self):
        command = self.command_input.text().strip()
        if not command:
            return
            
        # Show command in terminal
        self.terminal_output.append(f"$ {command}")
        
        # Handle special commands
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
• Any other shell command will be executed

Browser:
• Use the URL bar above to navigate to websites
• Full Chromium engine - supports all modern web features

"""
            self.terminal_output.append(help_text)
        else:
            # Queue command for execution
            self.command_queue.put(command)
            
        # Clear input
        self.command_input.clear()
        
    def append_terminal_output(self, text):
        # Handle ANSI clear screen
        if '\\033[2J\\033[H' in text:
            self.terminal_output.clear()
            return
            
        self.terminal_output.append(text.rstrip())
        
        # Auto-scroll to bottom
        scrollbar = self.terminal_output.verticalScrollBar()
        scrollbar.setValue(scrollbar.maximum())
        
    def load_url(self):
        url = self.url_input.text().strip()
        if not url:
            return
            
        # Add protocol if missing
        if not url.startswith(('http://', 'https://')):
            if '.' in url and ' ' not in url:
                url = 'https://' + url
            else:
                # Search query
                url = f"https://www.google.com/search?q={url.replace(' ', '+')}"
                
        self.browser.setUrl(QUrl(url))
        self.url_input.setText(url)
        
        # Show in terminal
        self.terminal_output.append(f"🌐 Loading: {url}")
        
    def closeEvent(self, event):
        # Cleanup terminal worker
        self.command_queue.put(None)  # Shutdown signal
        self.terminal_worker.wait()
        event.accept()

def main():
    app = QApplication(sys.argv)
    
    # Set application properties
    app.setApplicationName("CEF Terminal Browser")
    app.setApplicationVersion("1.0")
    
    window = CEFTerminalBrowser()
    window.show()
    
    sys.exit(app.exec())

if __name__ == '__main__':
    main()