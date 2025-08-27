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
from PyQt6.QtCore import Qt, QThread, pyqtSignal, QTimer, QUrl, pyqtSlot
from PyQt6.QtGui import QFont, QPalette, QColor, QTextCursor, QKeyEvent

class PTYTerminal(QTextEdit):
    """A working PTY terminal that you can actually type in"""
    
    output_signal = pyqtSignal(str)
    
    def __init__(self):
        super().__init__()
        self.setup_terminal()
        self.init_pty()
        # Connect signal to slot
        self.output_signal.connect(self.append_output)
        
    def setup_terminal(self):
        # Terminal appearance
        font = QFont('Courier', 12)
        self.setFont(font)
        
        self.setStyleSheet("""
            QTextEdit {
                background-color: #000000;
                color: #00ff00;
                border: 1px solid #333;
                font-family: 'Courier New', monospace;
                font-size: 12px;
            }
        """)
        
        # Make it focusable and editable
        self.setFocusPolicy(Qt.FocusPolicy.StrongFocus)
        self.setReadOnly(False)
        
        # Show cursor
        cursor = self.textCursor()
        self.setTextCursor(cursor)
        
    def init_pty(self):
        """Initialize PTY with shell"""
        try:
            # Create PTY
            self.master_fd, self.slave_fd = pty.openpty()
            
            # Start shell
            shell = os.environ.get('SHELL', '/bin/bash')
            self.shell_process = subprocess.Popen(
                [shell, '-i'],  # Interactive shell
                stdin=self.slave_fd,
                stdout=self.slave_fd,
                stderr=self.slave_fd,
                preexec_fn=os.setsid,
                env=os.environ,
                cwd=os.getcwd()
            )
            
            # Make master non-blocking
            flags = fcntl.fcntl(self.master_fd, fcntl.F_GETFL)
            fcntl.fcntl(self.master_fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)
            
            # Set terminal size
            self.resize_pty()
            
            # Start reading thread
            self.reading = True
            self.read_thread = threading.Thread(target=self.read_output, daemon=True)
            self.read_thread.start()
            
            print("PTY terminal initialized successfully!")
            
        except Exception as e:
            print(f"Failed to initialize PTY: {e}")
            
    def read_output(self):
        """Read from PTY in separate thread"""
        while self.reading:
            try:
                # Wait for data
                ready, _, _ = select.select([self.master_fd], [], [], 0.1)
                if ready and self.master_fd in ready:
                    data = os.read(self.master_fd, 4096)
                    if data:
                        text = data.decode('utf-8', errors='replace')
                        # Emit signal to update UI
                        self.output_signal.emit(text)
                    else:
                        break
            except (OSError, ValueError):
                break
            except Exception as e:
                print(f"Error reading PTY: {e}")
                break
                
    @pyqtSlot(str)
    def append_output(self, text):
        """Append text to terminal (called in main thread)"""
        # Handle some ANSI codes
        if '\\033[2J' in text:
            self.clear()
            text = text.replace('\\033[2J', '')
        if '\\033[H' in text:
            cursor = QTextCursor(self.document())
            cursor.movePosition(QTextCursor.MoveOperation.Start)
            self.setTextCursor(cursor)
            text = text.replace('\\033[H', '')
            
        # Insert text at cursor position
        cursor = self.textCursor()
        cursor.insertText(text)
        self.setTextCursor(cursor)
        
        # Scroll to bottom
        scrollbar = self.verticalScrollBar()
        scrollbar.setValue(scrollbar.maximum())
        
    def keyPressEvent(self, event):
        """Handle all key presses and send to PTY"""
        try:
            key = event.key()
            modifiers = event.modifiers()
            text = event.text()
            
            # Convert key to bytes
            data = b''
            
            if key == Qt.Key.Key_Return or key == Qt.Key.Key_Enter:
                data = b'\\r'
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
            elif modifiers & Qt.KeyboardModifier.ControlModifier:
                if key == Qt.Key.Key_C:
                    data = b'\\003'  # Ctrl+C
                elif key == Qt.Key.Key_D:
                    data = b'\\004'  # Ctrl+D  
                elif key == Qt.Key.Key_Z:
                    data = b'\\032'  # Ctrl+Z
                elif key == Qt.Key.Key_L:
                    data = b'\\014'  # Ctrl+L (clear)
                else:
                    # Other Ctrl combinations
                    if text:
                        data = text.encode('utf-8')
            else:
                # Regular text input
                if text and text.isprintable():
                    data = text.encode('utf-8')
                    
            # Send to PTY
            if data and hasattr(self, 'master_fd'):
                try:
                    os.write(self.master_fd, data)
                except (OSError, BrokenPipeError):
                    pass
                    
        except Exception as e:
            print(f"Key press error: {e}")
            
        # DON'T call super() - we handle everything
        
    def resize_pty(self):
        """Set PTY window size"""
        try:
            if hasattr(self, 'master_fd'):
                # Simple fixed size for now
                rows, cols = 24, 80
                winsize = struct.pack('HHHH', rows, cols, 0, 0)
                fcntl.ioctl(self.master_fd, termios.TIOCSWINSZ, winsize)
        except Exception as e:
            print(f"Resize error: {e}")
            
    def cleanup(self):
        """Clean up PTY"""
        try:
            self.reading = False
            if hasattr(self, 'shell_process') and self.shell_process.poll() is None:
                self.shell_process.terminate()
            if hasattr(self, 'master_fd'):
                os.close(self.master_fd)
            if hasattr(self, 'slave_fd'):
                os.close(self.slave_fd)
        except Exception as e:
            print(f"Cleanup error: {e}")

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.init_ui()
        
    def init_ui(self):
        self.setWindowTitle("Real PTY Terminal + Browser")
        self.setGeometry(100, 100, 1400, 900)
        
        # Dark theme
        self.setStyleSheet("""
            QMainWindow { background-color: #1e1e1e; }
            QWidget { background-color: #1e1e1e; color: white; }
            QLineEdit { 
                background-color: #333; 
                color: white; 
                border: 1px solid #666;
                padding: 5px;
            }
            QPushButton {
                background-color: #007acc;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
            }
            QPushButton:hover { background-color: #005a9e; }
        """)
        
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        layout = QVBoxLayout(central_widget)
        layout.setContentsMargins(0, 0, 0, 0)
        
        # URL bar
        url_frame = QFrame()
        url_frame.setFixedHeight(50)
        url_layout = QHBoxLayout(url_frame)
        
        self.url_input = QLineEdit("https://www.google.com")
        self.url_input.returnPressed.connect(self.load_url)
        url_layout.addWidget(QLabel("URL:"))
        url_layout.addWidget(self.url_input)
        
        go_btn = QPushButton("Go")
        go_btn.clicked.connect(self.load_url)
        url_layout.addWidget(go_btn)
        
        layout.addWidget(url_frame)
        
        # Splitter
        splitter = QSplitter(Qt.Orientation.Horizontal)
        layout.addWidget(splitter)
        
        # Terminal side
        terminal_frame = QFrame()
        terminal_layout = QVBoxLayout(terminal_frame)
        terminal_layout.setContentsMargins(5, 5, 5, 5)
        
        terminal_layout.addWidget(QLabel("💻 Real PTY Terminal (Click here and start typing!)"))
        self.terminal = PTYTerminal()
        terminal_layout.addWidget(self.terminal)
        
        splitter.addWidget(terminal_frame)
        
        # Browser side  
        browser_frame = QFrame()
        browser_layout = QVBoxLayout(browser_frame)
        browser_layout.setContentsMargins(5, 5, 5, 5)
        
        browser_layout.addWidget(QLabel("🌐 Browser"))
        self.browser = QWebEngineView()
        self.browser.setUrl(QUrl("https://www.google.com"))
        browser_layout.addWidget(self.browser)
        
        splitter.addWidget(browser_frame)
        
        # Equal split
        splitter.setSizes([700, 700])
        
        # Focus terminal by default
        QTimer.singleShot(500, lambda: self.terminal.setFocus())
        
    def load_url(self):
        url = self.url_input.text()
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        self.browser.setUrl(QUrl(url))
        
    def closeEvent(self, event):
        if hasattr(self, 'terminal'):
            self.terminal.cleanup()
        event.accept()

def main():
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())

if __name__ == '__main__':
    main()