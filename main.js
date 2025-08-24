const { app, BrowserWindow, BrowserView, Menu, ipcMain, dialog } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const pty = require('node-pty');
const { spawn } = require('child_process');

// Get full user environment by reading from the user's shell
async function getFullUserEnv() {
  return new Promise((resolve) => {
    const shell = process.env.SHELL || '/bin/zsh';
    const envProcess = spawn(shell, ['-c', 'env'], { 
      stdio: ['ignore', 'pipe', 'ignore'] 
    });
    
    let envOutput = '';
    envProcess.stdout.on('data', (data) => {
      envOutput += data.toString();
    });
    
    envProcess.on('close', () => {
      const env = { ...process.env }; // Start with current env
      
      // Parse the shell environment
      envOutput.split('\n').forEach(line => {
        const equalIndex = line.indexOf('=');
        if (equalIndex > 0) {
          const key = line.substring(0, equalIndex);
          const value = line.substring(equalIndex + 1);
          env[key] = value;
        }
      });
      
      // Ensure essential paths are included
      if (!env.PATH.includes('/opt/homebrew/bin')) {
        env.PATH = `/opt/homebrew/bin:/opt/homebrew/sbin:${env.PATH}`;
      }
      if (!env.PATH.includes('/usr/local/bin')) {
        env.PATH = `/usr/local/bin:${env.PATH}`;
      }
      
      resolve(env);
    });
  });
}

if (process.env.NODE_ENV === 'development') {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit'
  });
}

let mainWindow;
let browserViews = new Map(); // Store multiple browser views
let activeBrowserId = null; // Track the currently active browser
let ptyProcess = null;
let claudePtyProcess = null;
let terminalProcesses = new Map(); // Store multiple terminal processes

function createWindow() {
  let iconPath = null;
  
  // Try to set icon in development mode (may not always work)
  if (process.env.NODE_ENV !== 'production') {
    iconPath = path.join(__dirname, 'assets', 'logo.png');
  }

  const windowOptions = {
    width: 1400,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  };

  // Add icon if available (for development testing)
  if (iconPath && require('fs').existsSync(iconPath)) {
    windowOptions.icon = iconPath;
    console.log('Development icon set:', iconPath);
  }

  mainWindow = new BrowserWindow(windowOptions);

  mainWindow.loadFile('index.html');

  // Don't create a default browser view anymore - they'll be created on demand

  mainWindow.on('resize', () => {
    // Browser position will be updated via browser-mount-bounds message from renderer
  });

  // Create a new browser view for a specific tab
  ipcMain.on('create-browser-view', (event, browserId) => {
    console.log('Creating browser view for:', browserId);
    
    if (browserViews.has(browserId)) {
      console.log('Browser view already exists for:', browserId);
      return;
    }
    
    const browserView = new BrowserView({
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: false,
        allowRunningInsecureContent: true,
        experimentalFeatures: true
      }
    });
    
    browserView.webContents.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Store the browser view
    browserViews.set(browserId, {
      view: browserView,
      bounds: null
    });
    
    // Set up navigation listeners for this specific browser
    browserView.webContents.on('did-navigate', (event, url) => {
      mainWindow.webContents.send('browser-navigated', browserId, url);
    });
    
    browserView.webContents.on('did-navigate-in-page', (event, url) => {
      mainWindow.webContents.send('browser-navigated', browserId, url);
    });
    
    // Load default URL
    browserView.webContents.loadURL('https://localhost/customize');
  });
  
  ipcMain.on('navigate-browser', (event, browserId, url) => {
    const browserData = browserViews.get(browserId);
    if (!browserData) {
      console.error('Browser view not found for:', browserId);
      return;
    }
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    browserData.view.webContents.loadURL(url);
  });

  ipcMain.on('browser-back', (event, browserId) => {
    const browserData = browserViews.get(browserId);
    if (browserData && browserData.view.webContents.canGoBack()) {
      browserData.view.webContents.goBack();
    }
  });

  ipcMain.on('browser-forward', (event, browserId) => {
    const browserData = browserViews.get(browserId);
    if (browserData && browserData.view.webContents.canGoForward()) {
      browserData.view.webContents.goForward();
    }
  });

  ipcMain.on('browser-refresh', (event, browserId) => {
    const browserData = browserViews.get(browserId);
    if (browserData) {
      browserData.view.webContents.reloadIgnoringCache();
    }
  });

  ipcMain.on('browser-devtools', (event, browserId) => {
    const browserData = browserViews.get(browserId);
    if (browserData) {
      if (browserData.view.webContents.isDevToolsOpened()) {
        browserData.view.webContents.closeDevTools();
      } else {
        browserData.view.webContents.openDevTools();
      }
    }
  });

  ipcMain.on('hide-browser-view', (event, browserId) => {
    const browserData = browserViews.get(browserId);
    if (browserData && mainWindow) {
      mainWindow.removeBrowserView(browserData.view);
    }
  });

  ipcMain.on('show-browser-view', (event, browserId) => {
    // Hide all other browser views first
    browserViews.forEach((data, id) => {
      if (id !== browserId && mainWindow) {
        mainWindow.removeBrowserView(data.view);
      }
    });
    
    const browserData = browserViews.get(browserId);
    if (browserData && mainWindow) {
      activeBrowserId = browserId;
      mainWindow.addBrowserView(browserData.view);
      // Restore the bounds if we have them
      if (browserData.bounds) {
        browserData.view.setBounds(browserData.bounds);
      }
    }
  });

  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Project Folder'
    });
    
    if (result.canceled) {
      return null;
    }
    
    return result.filePaths[0];
  });

  ipcMain.handle('list-files', async (event, dirPath) => {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      return entries.map(entry => ({
        name: entry.name,
        isDirectory: entry.isDirectory(),
        path: path.join(dirPath, entry.name)
      }));
    } catch (error) {
      console.error('Error reading directory:', error);
      return [];
    }
  });

  ipcMain.handle('read-text-file', async (event, filePath) => {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return content;
    } catch (error) {
      console.error('Error reading file:', error);
      throw error;
    }
  });

  ipcMain.handle('write-text-file', async (event, filePath, content) => {
    try {
      await fs.writeFile(filePath, content, 'utf8');
      return true;
    } catch (error) {
      console.error('Error writing file:', error);
      throw error;
    }
  });

  // Remove old global browser view navigation listeners (now handled per browser view)

  ipcMain.on('browser-mount-bounds', (event, browserId, bounds) => {
    const browserData = browserViews.get(browserId);
    if (browserData) {
      browserData.bounds = {
        x: Math.floor(bounds.x),
        y: Math.floor(bounds.y),
        width: Math.floor(bounds.width),
        height: Math.floor(bounds.height)
      };
      
      // Only update the position if this is the active browser
      if (browserId === activeBrowserId) {
        browserData.view.setBounds(browserData.bounds);
      }
    }
  });
  
  // Clean up browser view when tab is closed
  ipcMain.on('destroy-browser-view', (event, browserId) => {
    console.log('Destroying browser view for:', browserId);
    const browserData = browserViews.get(browserId);
    if (browserData) {
      if (mainWindow) {
        mainWindow.removeBrowserView(browserData.view);
      }
      // Clean up the browser view
      browserData.view.webContents.closeDevTools();
      browserViews.delete(browserId);
      
      if (activeBrowserId === browserId) {
        activeBrowserId = null;
      }
    }
  })

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
    // Clean up all browser views
    browserViews.forEach((data) => {
      if (data.view.webContents) {
        data.view.webContents.closeDevTools();
      }
    });
    browserViews.clear();
    mainWindow = null;
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

ipcMain.handle('run-git-command', async (event, command, workingDir) => {
  return new Promise((resolve) => {
    // Parse command respecting quotes
    const args = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < command.length; i++) {
      const char = command[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ' ' && !inQuotes) {
        if (current) {
          args.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }
    
    if (current) {
      args.push(current);
    }
    
    console.log('Git command:', command);
    console.log('Parsed args:', args);
    
    const gitProcess = spawn('git', args, {
      cwd: workingDir,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let output = '';
    let error = '';
    
    gitProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    gitProcess.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    gitProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output: output });
      } else {
        resolve({ success: false, error: error.trim() || output.trim() });
      }
    });
    
    gitProcess.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
  });
});

// Terminal handlers using node-pty (real TTY)
ipcMain.handle('terminal-start', async (event, terminalId, projectPath) => {
  try {
    console.log('Starting terminal for ID:', terminalId);
    console.log('Project path received:', projectPath);
    
    // Clean up existing process for this terminal if it exists
    if (terminalProcesses.has(terminalId)) {
      const existingProcess = terminalProcesses.get(terminalId);
      existingProcess.kill();
      terminalProcesses.delete(terminalId);
    }
    
    // Get the full user environment
    const fullEnv = await getFullUserEnv();
    
    // Start PTY process with real shell
    const shell = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || '/bin/zsh');
    
    const workingDir = projectPath || process.cwd();
    console.log('Terminal starting in directory:', workingDir);
    
    const terminalProcess = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: workingDir,
      env: fullEnv
    });
    
    // Store the process
    terminalProcesses.set(terminalId, terminalProcess);
    
    // Send output to renderer with terminal ID
    terminalProcess.onData((data) => {
      mainWindow.webContents.send('terminal-output', terminalId, data);
    });
    
    terminalProcess.onExit((exitCode) => {
      mainWindow.webContents.send('terminal-output', terminalId, `\r\nTerminal session ended (code ${exitCode.exitCode})\r\n`);
      terminalProcesses.delete(terminalId);
    });
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('terminal-write', async (event, terminalId, data) => {
  try {
    const terminalProcess = terminalProcesses.get(terminalId);
    if (terminalProcess) {
      terminalProcess.write(data);
      return { success: true };
    }
    return { success: false, error: `Terminal ${terminalId} not running` };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('terminal-resize', async (event, terminalId, cols, rows) => {
  try {
    const terminalProcess = terminalProcesses.get(terminalId);
    if (terminalProcess) {
      terminalProcess.resize(cols, rows);
      return { success: true };
    }
    return { success: false, error: `Terminal ${terminalId} not running` };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('terminal-stop', async (event, terminalId) => {
  try {
    const terminalProcess = terminalProcesses.get(terminalId);
    if (terminalProcess) {
      terminalProcess.kill();
      terminalProcesses.delete(terminalId);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Claude Terminal handlers using node-pty (automatically runs "claude")
ipcMain.handle('claude-terminal-start', async (event, projectPath) => {
  try {
    if (claudePtyProcess) {
      claudePtyProcess.kill();
    }
    
    // Get the full user environment
    const fullEnv = await getFullUserEnv();
    
    // Start PTY process with real shell
    const shell = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || '/bin/zsh');
    
    claudePtyProcess = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: projectPath || process.cwd(),
      env: fullEnv
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