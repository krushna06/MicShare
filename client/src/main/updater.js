const { app, dialog, ipcMain } = require('electron');
const log = require('electron-log');
const { autoUpdater } = require('electron-updater');

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

function initUpdater(getWindow) {
  if (!app.isPackaged) {
    log.info('Auto-updater disabled in development');
    ipcMain.handle('updater:check', () => ({ status: 'disabled' }));
    return;
  }

  autoUpdater.logger = log;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  const send = (payload) => {
    const win = getWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('updater:status', payload);
    }
  };

  autoUpdater.on('checking-for-update', () => send({ status: 'checking' }));
  autoUpdater.on('update-available', (info) => {
    log.info('Update available', { version: info.version });
    send({ status: 'available', version: info.version });
  });
  autoUpdater.on('update-not-available', (info) => {
    log.info('No update available', { version: info.version });
    send({ status: 'up-to-date', version: info.version });
  });
  autoUpdater.on('download-progress', (progress) => {
    send({ status: 'downloading', percent: Math.round(progress.percent) });
  });
  autoUpdater.on('update-downloaded', async (info) => {
    log.info('Update downloaded', { version: info.version });
    send({ status: 'downloaded', version: info.version });
    const win = getWindow();
    const { response } = await dialog.showMessageBox(win, {
      type: 'info',
      title: 'Mic Share update ready',
      message: `Version ${info.version} is ready to install.`,
      detail: 'Restart Mic Share now to apply the update.',
      buttons: ['Restart now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    });
    if (response === 0) {
      setImmediate(() => autoUpdater.quitAndInstall());
    }
  });
  autoUpdater.on('error', (err) => {
    log.error('Auto-updater error', { error: err && err.message });
    send({ status: 'error', message: err && err.message });
  });

  const check = () =>
    autoUpdater.checkForUpdates().catch((err) => {
      log.warn('Update check failed', { error: err && err.message });
    });

  ipcMain.handle('updater:check', () => {
    check();
    return { status: 'checking' };
  });

  check();
  setInterval(check, CHECK_INTERVAL_MS);
}

module.exports = { initUpdater };
