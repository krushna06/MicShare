const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('micShare', {
  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', key),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
    delete: (key) => ipcRenderer.invoke('settings:delete', key),
  },
  auth: {
    get: () => ipcRenderer.invoke('auth:get'),
    set: (token) => ipcRenderer.invoke('auth:set', token),
    delete: () => ipcRenderer.invoke('auth:delete'),
  },
  app: {
    getVersion: () => ipcRenderer.invoke('app:get-version'),
    log: (level, message) => ipcRenderer.invoke('app:log', level, message),
  },
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    onStatus: (callback) => {
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on('updater:status', listener);
      return () => ipcRenderer.removeListener('updater:status', listener);
    },
  },
});
