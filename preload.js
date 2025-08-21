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
  panelResized: (sizes) => ipcRenderer.send('panel-resized', sizes)
});