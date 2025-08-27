#!/usr/bin/env python3

import sys
import os
import pty
import select
import subprocess
import termios
import signal
import fcntl
import struct
import threading
import time
from PyQt6.QtWidgets import (QApplication, QMainWindow, QWidget, QHBoxLayout, 
                             QVBoxLayout, QTextEdit, QLineEdit, QLabel, 
                             QPushButton, QSplitter, QFrame)
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtCore import Qt, QThread, pyqtSignal, QTimer, QUrl
from PyQt6.QtGui import QFont, QPalette, QColor, QTextCursor, QKeyEvent

class RealPTYTerminal(QTextEdit):
    """A proper PTY terminal emulator"""
    
    def __init__(self):
        super().__init__()
        self.setReadOnly(True)  # We handle all input ourselves
        self.setup_terminal()
        self.init_pty()
        self.setFocusPolicy(Qt.FocusPolicy.StrongFocus)  # Accept keyboard focus
        
    def setup_terminal(self):
        # Set terminal appearance
        font = QFont('Monaco', 12)
        font.setFamily('Monaco, Menlo, Courier New, monospace')
        self.setFont(font)
        
        # Terminal colors
        self.setStyleSheet("""
            QTextEdit {
                background-color: #1e1e1e;
                color: #f0f0f0;
                border: none;
            }
        """)
        
        # Cursor settings
        self.setLineWrapMode(QTextEdit.LineWrapMode.WidgetWidth)
        
    def init_pty(self):
        """Initialize the PTY with a real shell"""
        try:
            # Get user's preferred shell
            shell = os.environ.get('SHELL', '/bin/bash')
            
            # Create PTY
            self.master_fd, self.slave_fd = pty.openpty()
            
            # Start shell process
            self.shell_process = subprocess.Popen(
                [shell],
                stdin=self.slave_fd,
                stdout=self.slave_fd,
                stderr=self.slave_fd,
                env=os.environ.copy(),
                cwd=os.getcwd(),
                preexec_fn=os.setsid,  # Create new session
                start_new_session=True
            )
            
            # Set PTY to non-blocking
            fcntl.fcntl(self.master_fd, fcntl.F_SETFL, os.O_NONBLOCK)
            
            # Start reading thread
            self.read_thread = threading.Thread(target=self.read_from_pty)
            self.read_thread.daemon = True
            self.read_thread.start()
            
            # Set initial terminal size
            self.resize_pty()
            
            print(f"Real PTY terminal started with shell: {shell}")
            
        except Exception as e:
            print(f"Failed to initialize PTY: {e}")
            
    def read_from_pty(self):
        """Read output from PTY and display it"""
        while True:
            try:
                if hasattr(self, 'master_fd'):
                    ready, _, _ = select.select([self.master_fd], [], [], 0.1)
                    if ready:
                        data = os.read(self.master_fd, 8192)
                        if data:
                            # Convert bytes to string and handle ANSI escape sequences
                            text = data.decode('utf-8', errors='replace')
                            # Emit signal to update UI in main thread
                            self.update_terminal_output(text)
                        else:
                            break
                else:
                    break
            except OSError:
                # PTY closed
                break
            except Exception as e:
                print(f"Error reading from PTY: {e}")
                break
                
    def update_terminal_output(self, text):
        """Update terminal output (must be called from main thread)"""
        # Use signal to ensure we're in the main thread
        from PyQt6.QtCore import QMetaObject, Qt
        QMetaObject.invokeMethod(self, "_append_to_terminal", Qt.ConnectionType.QueuedConnection, 
                               Qt.QueuedConnection, text)
        
    def _append_to_terminal(self, text):
        """Actually append text to terminal (main thread only)"""
        # Handle special characters and ANSI escape sequences
        cursor = self.textCursor()
        cursor.movePosition(QTextCursor.MoveOperation.End)
        
        # Simple ANSI handling (can be expanded)
        if '\\033[2J' in text:  # Clear screen
            self.clear()
            text = text.replace('\\033[2J', '')
        if '\\033[H' in text:  # Move cursor to home
            cursor.movePosition(QTextCursor.MoveOperation.Start)
            text = text.replace('\\033[H', '')
            
        # Insert text
        cursor.insertText(text)
        self.setTextCursor(cursor)
        
        # Auto-scroll to bottom
        scrollbar = self.verticalScrollBar()
        scrollbar.setValue(scrollbar.maximum())
        
    def keyPressEvent(self, event):
        """Handle key presses and send to PTY"""
        try:
            # Get the key
            key = event.key()
            text = event.text()
            modifiers = event.modifiers()
            
            # Handle special keys
            if key == Qt.Key.Key_Return or key == Qt.Key.Key_Enter:
                data = b'\\n'
            elif key == Qt.Key.Key_Backspace:
                data = b'\\b'
            elif key == Qt.Key.Key_Tab:
                data = b'\\t'
            elif key == Qt.Key.Key_Escape:
                data = b'\\033'
            elif key == Qt.Key.Key_Up:
                data = b'\\033[A'
            elif key == Qt.Key.Key_Down:
                data = b'\\033[B'
            elif key == Qt.Key.Key_Right:
                data = b'\\033[C'
            elif key == Qt.Key.Key_Left:
                data = b'\\033[D'
            elif key == Qt.Key.Key_Delete:
                data = b'\\033[3~'
            elif key == Qt.Key.Key_Home:
                data = b'\\033[H'
            elif key == Qt.Key.Key_End:
                data = b'\\033[F'
            elif key == Qt.Key.Key_PageUp:
                data = b'\\033[5~'
            elif key == Qt.Key.Key_PageDown:
                data = b'\\033[6~'
            elif modifiers & Qt.KeyboardModifier.ControlModifier:
                # Handle Ctrl+key combinations
                if key == Qt.Key.Key_C:
                    data = b'\\003'  # Ctrl+C
                elif key == Qt.Key.Key_D:
                    data = b'\\004'  # Ctrl+D
                elif key == Qt.Key.Key_Z:
                    data = b'\\032'  # Ctrl+Z
                elif key == Qt.Key.Key_L:
                    data = b'\\014'  # Ctrl+L
                else:
                    # For other Ctrl combinations, send the control character
                    if ord('A') <= key <= ord('Z'):
                        data = bytes([key - ord('A') + 1])
                    else:
                        data = text.encode('utf-8') if text else b''
            else:
                # Regular character
                data = text.encode('utf-8') if text else b''
                
            # Send to PTY
            if data and hasattr(self, 'master_fd'):
                os.write(self.master_fd, data)
                
        except Exception as e:
            print(f"Error handling key press: {e}")
            
        # Don't call super() - we handle everything ourselves
        
    def resize_pty(self, rows=24, cols=80):
        """Resize the PTY"""
        try:
            if hasattr(self, 'master_fd'):
                # Calculate terminal size based on widget size
                font_metrics = self.fontMetrics()
                char_width = font_metrics.horizontalAdvance('m')
                char_height = font_metrics.height()
                
                widget_width = self.viewport().width()
                widget_height = self.viewport().height()
                
                cols = max(20, widget_width // char_width)
                rows = max(5, widget_height // char_height)
                
                # Set terminal size
                winsize = struct.pack('HHHH', rows, cols, 0, 0)
                fcntl.ioctl(self.master_fd, termios.TIOCSWINSZ, winsize)
                
                # Send SIGWINCH to notify processes
                if hasattr(self, 'shell_process') and self.shell_process.poll() is None:
                    os.kill(self.shell_process.pid, signal.SIGWINCH)
                    
        except Exception as e:
            print(f"Error resizing PTY: {e}")
            
    def resizeEvent(self, event):
        """Handle widget resize"""
        super().resizeEvent(event)
        QTimer.singleShot(100, self.resize_pty)  # Delay resize to avoid spam
        
    def closeEvent(self, event):
        """Clean up PTY on close"""
        self.cleanup_pty()
        super().closeEvent(event)
        
    def cleanup_pty(self):
        """Clean up PTY resources"""
        try:
            if hasattr(self, 'shell_process') and self.shell_process.poll() is None:
                self.shell_process.terminate()
                self.shell_process.wait(timeout=5)
                
            if hasattr(self, 'master_fd'):
                os.close(self.master_fd)
            if hasattr(self, 'slave_fd'):
                os.close(self.slave_fd)
                
        except Exception as e:
            print(f"Error cleaning up PTY: {e}")

class CEFWithRealTerminal(QMainWindow):
    def __init__(self):
        super().__init__()
        self.init_ui()
        
    def init_ui(self):
        self.setWindowTitle("CEF Browser with Real PTY Terminal")
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
            QLineEdit {
                background-color: #2d2d2d;
                color: #f0f0f0;
                font-size: 14px;
                border: 1px solid #444;
                padding: 8px;
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
        self.statusBar().showMessage("Real PTY Terminal | CEF Browser")
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
        
        terminal_label = QLabel("💻 Real PTY Terminal")
        header_layout.addWidget(terminal_label)
        terminal_layout.addWidget(header_frame)
        
        # Real PTY terminal
        self.terminal = RealPTYTerminal()
        terminal_layout.addWidget(self.terminal)
        
        parent.addWidget(terminal_frame)
        
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
        
        browser_label = QLabel("🌐 Chromium Browser")
        browser_label.setStyleSheet("color: white;")
        header_layout.addWidget(browser_label)
        browser_layout.addWidget(header_frame)
        
        # CEF WebEngine browser
        self.browser = QWebEngineView()
        self.browser.setUrl(QUrl("https://www.google.com"))
        browser_layout.addWidget(self.browser)
        
        parent.addWidget(browser_frame)
        
    def load_url(self):
        url = self.url_input.text().strip()
        if not url:
            return
            
        # Add protocol if missing
        if not url.startswith(('http://', 'https://')):
            if '.' in url and ' ' not in url:
                url = 'https://' + url
            else:
                url = f"https://www.google.com/search?q={url.replace(' ', '+')}"
                
        self.browser.setUrl(QUrl(url))
        self.url_input.setText(url)
        
    def closeEvent(self, event):
        # Cleanup terminal
        if hasattr(self, 'terminal'):
            self.terminal.cleanup_pty()
        event.accept()

def main():
    app = QApplication(sys.argv)
    
    # Set application properties
    app.setApplicationName("CEF with Real PTY Terminal")
    app.setApplicationVersion("1.0")
    
    window = CEFWithRealTerminal()
    window.show()
    
    # Focus on terminal by default
    if hasattr(window, 'terminal'):
        window.terminal.setFocus()
    
    sys.exit(app.exec())

if __name__ == '__main__':
    main()