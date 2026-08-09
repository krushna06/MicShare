const { app, BrowserWindow, shell, session, Menu } = require('electron');
const path = require('node:path');
const log = require('electron-log');
const { registerIpcHandlers } = require('./ipc');
const { initUpdater } = require('./updater');

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

function createMainWindow() {
  const window = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 800,
    minHeight: 600,
    title: 'Mic Share',
    show: false,
    maximizable: false,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  window.once('ready-to-show', () => {
    window.show();
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  window.webContents.on('will-navigate', (event, url) => {
    const allowed = isDev ? url.startsWith(process.env.VITE_DEV_SERVER_URL) : url.startsWith('file://');
    if (!allowed) event.preventDefault();
  });

  if (isDev) {
    window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    window.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'));
  }

  return window;
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);

  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'media');
  });

  registerIpcHandlers();
  log.info('Mic Share client starting', { version: app.getVersion(), isDev });

  createMainWindow();
  initUpdater(() => BrowserWindow.getAllWindows()[0]);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
