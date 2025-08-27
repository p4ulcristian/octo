# Python Chrome Browser with Embedded CEF

A Python application that implements a Chrome-like browser interface using PyWebView (which uses the system's WebKit/Chromium engine).

## Features

- **Full Browser Interface**: Chrome-like UI with navigation toolbar
- **URL Navigation**: Enter URLs or search terms in the address bar
- **Browser Controls**: Back, Forward, and Refresh buttons
- **History Management**: Navigate through browsing history
- **Embedded Browser**: Uses system's native browser engine via PyWebView

## Requirements

- Python 3.8+
- macOS (uses WebKit engine)
- Virtual environment recommended

## Installation

1. Clone or download this project
2. Create and activate a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Application

### Method 1: Direct execution
```bash
source venv/bin/activate
python main.py
```

### Method 2: Using the run script
```bash
python3 run.py
```

## Usage

1. The application opens with a Chrome-like browser window
2. Enter URLs in the address bar or type search terms
3. Use navigation buttons:
   - **Back**: Go to previous page
   - **Forward**: Go to next page (after going back)
   - **Refresh**: Reload current page
4. The browser automatically adds `https://` to domain names and searches Google for other queries

## Architecture

- **PyWebView**: Provides the native window and WebKit integration
- **Bottle**: Lightweight web server for serving the browser interface
- **HTML/CSS/JavaScript**: Browser UI and functionality
- **Threading**: Separate thread for the local web server

## Files

- `main.py`: Main application with browser implementation
- `run.py`: Launcher script that handles virtual environment
- `requirements.txt`: Python dependencies
- `README.md`: This documentation

## Limitations

- Limited to websites that allow iframe embedding
- Some websites may not load due to X-Frame-Options restrictions
- No support for browser extensions or plugins
- Basic feature set compared to full browsers

## Extending the Application

The browser can be extended by:
- Adding more navigation features to the HTML interface
- Implementing bookmarks functionality
- Adding download management
- Creating multiple tab support
- Adding developer tools integration