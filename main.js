const { app, BrowserWindow, BrowserView, Menu, ipcMain, dialog } = require('electron');
const path = require('path');

let mainWindow;
let browserView;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
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
      nodeIntegration: false
    }
  });

  mainWindow.removeBrowserView(browserView);
  browserView.webContents.loadURL('https://www.google.com');

  mainWindow.on('resize', () => {
    if (browserView) {
      const contentBounds = mainWindow.getContentBounds();
      const viewBounds = {
        x: 0,
        y: 150,
        width: contentBounds.width,
        height: contentBounds.height - 200
      };
      browserView.setBounds(viewBounds);
    }
  });

  ipcMain.on('switch-tab', (event, tabName) => {
    if (tabName === 'browser') {
      mainWindow.setBrowserView(browserView);
      const contentBounds = mainWindow.getContentBounds();
      browserView.setBounds({ 
        x: 0, 
        y: 150,
        width: contentBounds.width, 
        height: contentBounds.height - 200
      });
    } else {
      mainWindow.removeBrowserView(browserView);
    }
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

  browserView.webContents.on('did-navigate', (event, url) => {
    mainWindow.webContents.send('browser-navigated', url);
  });

  browserView.webContents.on('did-navigate-in-page', (event, url) => {
    mainWindow.webContents.send('browser-navigated', url);
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
              detail: 'This is a simple Electron application demonstrating basic features.',
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
  if (process.platform !== 'darwin') {
    app.quit();
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