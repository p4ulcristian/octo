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
  createBrowserView: (browserId) => ipcRenderer.send('create-browser-view', browserId),
  destroyBrowserView: (browserId) => ipcRenderer.send('destroy-browser-view', browserId),
  navigateBrowser: (browserId, url) => ipcRenderer.send('navigate-browser', browserId, url),
  browserBack: (browserId) => ipcRenderer.send('browser-back', browserId),
  browserForward: (browserId) => ipcRenderer.send('browser-forward', browserId),
  browserRefresh: (browserId) => ipcRenderer.send('browser-refresh', browserId),
  browserDevTools: (browserId) => ipcRenderer.send('browser-devtools', browserId),
  hideBrowserView: (browserId) => ipcRenderer.send('hide-browser-view', browserId),
  showBrowserView: (browserId) => ipcRenderer.send('show-browser-view', browserId),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  listFiles: (dirPath) => ipcRenderer.invoke('list-files', dirPath),
  readTextFile: (filePath) => ipcRenderer.invoke('read-text-file', filePath),
  writeTextFile: (filePath, content) => ipcRenderer.invoke('write-text-file', filePath, content),
  onBrowserNavigated: (callback) => {
    ipcRenderer.on('browser-navigated', (event, browserId, url) => callback(browserId, url));
  },
  panelResized: (panelType, sizes) => ipcRenderer.send('panel-resized', panelType, sizes),
  sendBrowserMountBounds: (browserId, bounds) => ipcRenderer.send('browser-mount-bounds', browserId, bounds),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  runGitCommand: (command, workingDir) => ipcRenderer.invoke('run-git-command', command, workingDir),
  
  // Terminal functions
  terminalStart: (terminalId, projectPath) => ipcRenderer.invoke('terminal-start', terminalId, projectPath),
  terminalWrite: (terminalId, data) => ipcRenderer.invoke('terminal-write', terminalId, data),
  terminalStop: (terminalId) => ipcRenderer.invoke('terminal-stop', terminalId),
  terminalResize: (terminalId, cols, rows) => ipcRenderer.invoke('terminal-resize', terminalId, cols, rows),
  onTerminalOutput: (callback) => {
    const handler = (event, terminalId, data) => callback(terminalId, data);
    ipcRenderer.on('terminal-output', handler);
    // Return a function to remove the listener
    return () => ipcRenderer.removeListener('terminal-output', handler);
  },
  
  // Claude terminal functions
  claudeTerminalStart: (projectPath) => ipcRenderer.invoke('claude-terminal-start', projectPath),
  claudeTerminalWrite: (data) => ipcRenderer.invoke('claude-terminal-write', data),
  claudeTerminalStop: () => ipcRenderer.invoke('claude-terminal-stop'),
  claudeTerminalResize: (cols, rows) => ipcRenderer.invoke('claude-terminal-resize', cols, rows),
  onClaudeTerminalOutput: (callback) => {
    ipcRenderer.on('claude-terminal-output', (event, data) => callback(data));
  }
});