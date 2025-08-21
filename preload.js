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
  })
});