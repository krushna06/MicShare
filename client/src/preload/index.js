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
  window: {
    flash: (enable) => ipcRenderer.invoke('window:flash', enable),
  },
  soundboard: {
    list: () => ipcRenderer.invoke('soundboard:list'),
    pickFiles: () => ipcRenderer.invoke('soundboard:pick'),
    rename: (id, name) => ipcRenderer.invoke('soundboard:rename', id, name),
    setKeybind: (id, accelerator) => ipcRenderer.invoke('soundboard:set-keybind', id, accelerator),
    removeKeybind: (id) => ipcRenderer.invoke('soundboard:remove-keybind', id),
    delete: (id) => ipcRenderer.invoke('soundboard:delete', id),
    onPlay: (callback) => {
      const listener = (_event, soundId) => callback(soundId);
      ipcRenderer.on('soundboard:play', listener);
      return () => ipcRenderer.removeListener('soundboard:play', listener);
    },
    getGlobalListenerActive: () => ipcRenderer.invoke('soundboard:get-global-listener'),
    onGlobalListenerStatus: (callback) => {
      const listener = (_event, active) => callback(active);
      ipcRenderer.on('soundboard:global-listener-status', listener);
      return () => ipcRenderer.removeListener('soundboard:global-listener-status', listener);
    },
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
