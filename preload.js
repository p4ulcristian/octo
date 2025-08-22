const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  showMessage: (title, message) => ipcRenderer.invoke('show-message', title, message),
  getAppVersion: () => ipcRenderer.invoke('app-version'),
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-new', callback);
    ipcRenderer.on('menu-open', callback);
  },
  getVersions: () => ({
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }),
  switchTab: (tabName) => ipcRenderer.send('switch-tab', tabName),
  navigateBrowser: (url) => ipcRenderer.send('navigate-browser', url),
  browserBack: () => ipcRenderer.send('browser-back'),
  browserForward: () => ipcRenderer.send('browser-forward'),
  browserRefresh: () => ipcRenderer.send('browser-refresh'),
  browserDevTools: () => ipcRenderer.send('browser-devtools'),
  onBrowserNavigated: (callback) => {
    ipcRenderer.on('browser-navigated', (event, url) => callback(url));
  },
  panelResized: (panelType, sizes) => ipcRenderer.send('panel-resized', panelType, sizes),
  sendBrowserMountBounds: (bounds) => ipcRenderer.send('browser-mount-bounds', bounds),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  
  // Terminal functions
  terminalStart: () => ipcRenderer.invoke('terminal-start'),
  terminalWrite: (data) => ipcRenderer.invoke('terminal-write', data),
  terminalStop: () => ipcRenderer.invoke('terminal-stop'),
  terminalResize: (cols, rows) => ipcRenderer.invoke('terminal-resize', cols, rows),
  onTerminalOutput: (callback) => {
    ipcRenderer.on('terminal-output', (event, data) => callback(data));
  },
  
  // Claude terminal functions
  claudeTerminalStart: () => ipcRenderer.invoke('claude-terminal-start'),
  claudeTerminalWrite: (data) => ipcRenderer.invoke('claude-terminal-write', data),
  claudeTerminalStop: () => ipcRenderer.invoke('claude-terminal-stop'),
  claudeTerminalResize: (cols, rows) => ipcRenderer.invoke('claude-terminal-resize', cols, rows),
  onClaudeTerminalOutput: (callback) => {
    ipcRenderer.on('claude-terminal-output', (event, data) => callback(data));
  }
});