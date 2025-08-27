# CEF Terminal & Browser Application

A professional Python application with a real PTY terminal and Chromium browser, built with PyQt6 WebEngine and xterm.js.

## Features

- **Real PTY Terminal**: Full TTY support with xterm.js frontend
- **Chromium Browser**: Complete web browser with CEF/WebEngine  
- **Split Screen**: Terminal and browser side-by-side
- **Professional UI**: Dark theme, resizable panes
- **Full Compatibility**: Works with vim, htop, ssh, and all interactive programs

## Requirements

- Python 3.12+ (for PyQt6 WebEngine compatibility)
- macOS, Windows, or Linux
- Virtual environment recommended

## Installation

1. Clone this project
2. Create virtual environment with Python 3.12:
   ```bash
   python3.12 -m venv venv_cef
   source venv_cef/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements_cef.txt
   ```

## Running the Application

### Direct execution:
```bash
source venv_cef/bin/activate
python proper_terminal.py
```

### Using launcher:
```bash
python3 run_proper_terminal.py
```

## Usage

1. **Terminal (Left Side)**:
   - Click in terminal area and start typing
   - Full shell with your `$SHELL` (bash/zsh)
   - All interactive programs work: `vim`, `htop`, `python`, `ssh`
   - Proper colors, cursor, and ANSI escape sequences

2. **Browser (Right Side)**:
   - Enter URLs in top bar
   - Full Chromium engine - loads all websites
   - No iframe restrictions

3. **Controls**:
   - Drag middle divider to resize panes
   - Standard terminal shortcuts: Ctrl+C, Ctrl+D, Ctrl+Z
   - Arrow keys for command history

## Technical Details

### Architecture
- **PyQt6 WebEngine**: Real Chromium browser engine
- **xterm.js**: Professional terminal emulator (same as VS Code)
- **Real PTY**: Uses `pty.openpty()` for true TTY support
- **WebSocket**: Bridges PTY output to browser terminal
- **Multi-threading**: Separate threads for PTY I/O and servers

### Terminal Features
- **True PTY**: Not subprocess - real pseudo-terminal
- **Full ANSI support**: Colors, cursor positioning, escape sequences  
- **Interactive programs**: vim, nano, htop, less, ssh all work perfectly
- **Proper resizing**: SIGWINCH signals sent on window resize
- **Shell integration**: Full environment, PATH, and shell features

## Files

- `proper_terminal.py`: Main application
- `run_proper_terminal.py`: Launcher script  
- `requirements_cef.txt`: Dependencies
- `README.md`: This documentation

## Troubleshooting

**If terminal doesn't connect:**
- Check that WebSocket server starts on port 8081
- Ensure no firewall blocking localhost connections

**If browser doesn't load:**
- Verify PyQt6-WebEngine is installed correctly
- Check system has WebEngine dependencies

**For interactive programs:**
- Terminal fully supports vim, htop, ssh, etc.
- Use standard terminal shortcuts (Ctrl+C, Ctrl+D)
- Colors and cursor work properly

## Development

This is a production-ready terminal emulator using industry-standard components:
- **xterm.js**: Powers VS Code, Hyper, and many professional terminals
- **PyQt6 WebEngine**: Based on Chromium, same engine as Chrome
- **Real PTY**: Proper Unix pseudo-terminal implementation