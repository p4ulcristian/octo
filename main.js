const { app, BrowserWindow, BrowserView, Menu, ipcMain, dialog } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const pty = require('node-pty');

if (process.env.NODE_ENV === 'development') {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit'
  });
}

let mainWindow;
let browserView;
let browserMountBounds = null;
let ptyProcess = null;
let claudePtyProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, 'icon.png')
  });

  mainWindow.loadFile('index.html');

  browserView = new BrowserView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
      experimentalFeatures: true
    }
  });

  browserView.webContents.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  mainWindow.addBrowserView(browserView);
  
  const contentBounds = mainWindow.getContentBounds();
  const totalWidth = contentBounds.width;
  const totalHeight = contentBounds.height;
  
  // Position BrowserView in the right panel (right 50% of the window)
  // Account for header (~50px), panel title (~30px), and browser controls (~40px)
  const rightPanelStart = Math.floor(totalWidth * 0.5);
  const rightPanelWidth = Math.floor(totalWidth * 0.5);
  
  // Initial positioning - will be updated by browser-mount-bounds
  browserView.setBounds({ 
    x: 700,
    y: 120,
    width: 600,
    height: 500
  });
  
  browserView.webContents.loadURL('https://localhost/customize');

  mainWindow.on('resize', () => {
    // Browser position will be updated via browser-mount-bounds message from renderer
  });

  ipcMain.on('navigate-browser', (event, url) => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    browserView.webContents.loadURL(url);
  });

  ipcMain.on('browser-back', () => {
    if (browserView.webContents.canGoBack()) {
      browserView.webContents.goBack();
    }
  });

  ipcMain.on('browser-forward', () => {
    if (browserView.webContents.canGoForward()) {
      browserView.webContents.goForward();
    }
  });

  ipcMain.on('browser-refresh', () => {
    browserView.webContents.reload();
  });

  ipcMain.on('browser-devtools', () => {
    if (browserView.webContents.isDevToolsOpened()) {
      browserView.webContents.closeDevTools();
    } else {
      browserView.webContents.openDevTools();
    }
  });

  browserView.webContents.on('did-navigate', (event, url) => {
    mainWindow.webContents.send('browser-navigated', url);
  });

  browserView.webContents.on('did-navigate-in-page', (event, url) => {
    mainWindow.webContents.send('browser-navigated', url);
  });

  ipcMain.on('browser-mount-bounds', (event, bounds) => {
    browserMountBounds = bounds;
    updateBrowserViewPosition();
  });

  function updateBrowserViewPosition() {
    if (browserView && browserMountBounds) {
      browserView.setBounds({
        x: Math.floor(browserMountBounds.x),
        y: Math.floor(browserMountBounds.y),
        width: Math.floor(browserMountBounds.width),
        height: Math.floor(browserMountBounds.height)
      });
    }
  }

  ipcMain.on('panel-resized', (event, panelType, sizes) => {
    // Browser position will be updated via browser-mount-bounds message
  });

  const menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new');
          }
        },
        {
          label: 'Open',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openFile'],
              filters: [
                { name: 'Text Files', extensions: ['txt', 'md'] },
                { name: 'All Files', extensions: ['*'] }
              ]
            });
            if (!result.canceled) {
              mainWindow.webContents.send('menu-open', result.filePaths[0]);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Force Reload', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: 'Toggle Developer Tools', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Actual Size', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'Toggle Fullscreen', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About',
              message: 'Electron Example App',
              detail: 'This is a simple Electron application with side-by-side app and browser.',
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ]);

  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
    browserView = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('before-quit', () => {
  if (mainWindow) {
    mainWindow.removeAllListeners('closed');
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.handle('show-message', async (event, title, message) => {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: title,
    message: message,
    buttons: ['OK', 'Cancel']
  });
  return result.response;
});

ipcMain.handle('app-version', () => {
  return app.getVersion();
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});


//HHello
ipcMain.handle('write-file', async (event, filePath, content) => {
  try {
    await fs.writeFile(filePath, content, 'utf8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Terminal handlers using node-pty (real TTY)
ipcMain.handle('terminal-start', async (event) => {
  try {
    if (ptyProcess) {
      ptyProcess.kill();
    }
    
    // Start PTY process with real shell
    const shell = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || '/bin/zsh');
    
    ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: process.cwd(),
      env: process.env
    });
    
    // Send output to renderer
    ptyProcess.onData((data) => {
      mainWindow.webContents.send('terminal-output', data);
    });
    
    ptyProcess.onExit((exitCode) => {
      mainWindow.webContents.send('terminal-output', `\r\nTerminal session ended (code ${exitCode.exitCode})\r\n`);
      ptyProcess = null;
    });
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('terminal-write', async (event, data) => {
  try {
    if (ptyProcess) {
      ptyProcess.write(data);
      return { success: true };
    }
    return { success: false, error: 'Terminal not running' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('terminal-resize', async (event, cols, rows) => {
  try {
    if (ptyProcess) {
      ptyProcess.resize(cols, rows);
      return { success: true };
    }
    return { success: false, error: 'Terminal not running' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('terminal-stop', async (event) => {
  try {
    if (ptyProcess) {
      ptyProcess.kill();
      ptyProcess = null;
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Claude Terminal handlers using node-pty (automatically runs "claude")
ipcMain.handle('claude-terminal-start', async (event) => {
  try {
    if (claudePtyProcess) {
      claudePtyProcess.kill();
    }
    
    // Start PTY process with real shell
    const shell = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || '/bin/zsh');
    
    claudePtyProcess = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: process.cwd(),
      env: process.env
    });
    
    // Send output to renderer
    claudePtyProcess.onData((data) => {
      mainWindow.webContents.send('claude-terminal-output', data);
    });
    
    claudePtyProcess.onExit((exitCode) => {
      mainWindow.webContents.send('claude-terminal-output', `\r\nClaude terminal session ended (code ${exitCode.exitCode})\r\n`);
      claudePtyProcess = null;
    });
    
    // Auto-run "claude" command after a brief delay
    setTimeout(() => {
      if (claudePtyProcess) {
        claudePtyProcess.write('claude\r');
      }
    }, 500);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('claude-terminal-write', async (event, data) => {
  try {
    if (claudePtyProcess) {
      claudePtyProcess.write(data);
      return { success: true };
    }
    return { success: false, error: 'Claude terminal not running' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('claude-terminal-resize', async (event, cols, rows) => {
  try {
    if (claudePtyProcess) {
      claudePtyProcess.resize(cols, rows);
      return { success: true };
    }
    return { success: false, error: 'Claude terminal not running' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('claude-terminal-stop', async (event) => {
  try {
    if (claudePtyProcess) {
      claudePtyProcess.kill();
      claudePtyProcess = null;
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});