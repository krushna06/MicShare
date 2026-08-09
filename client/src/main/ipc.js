const { ipcMain, safeStorage, app } = require('electron');
const Store = require('electron-store');
const log = require('electron-log');

const store = new Store({ name: 'micshare-settings' });

const AUTH_TOKEN_KEY = 'authToken';
const ENC_PREFIX = 'enc:v1:';

function encryptToken(token) {
  return `${ENC_PREFIX}${safeStorage.encryptString(token).toString('base64')}`;
}

function decryptToken(value) {
  if (!value.startsWith(ENC_PREFIX)) return null;
  try {
    return safeStorage.decryptString(Buffer.from(value.slice(ENC_PREFIX.length), 'base64'));
  } catch {
    return null;
  }
}

function registerIpcHandlers() {
  ipcMain.handle('settings:get', (event, key) => {
    if (typeof key !== 'string') return undefined;
    return store.get(key);
  });

  ipcMain.handle('settings:set', (event, key, value) => {
    if (typeof key !== 'string') return false;
    store.set(key, value);
    return true;
  });

  ipcMain.handle('settings:delete', (event, key) => {
    if (typeof key !== 'string') return false;
    store.delete(key);
    return true;
  });

  ipcMain.handle('auth:set', (event, token) => {
    if (typeof token !== 'string') return false;
    try {
      if (safeStorage.isEncryptionAvailable()) {
        store.set(AUTH_TOKEN_KEY, encryptToken(token));
      } else {
        log.warn('safeStorage unavailable; storing auth token without encryption');
        store.set(AUTH_TOKEN_KEY, token);
      }
      return true;
    } catch (err) {
      log.error('Failed to store auth token', { error: err.message });
      return false;
    }
  });

  ipcMain.handle('auth:get', () => {
    const value = store.get(AUTH_TOKEN_KEY);
    if (typeof value !== 'string' || value.length === 0) return null;
    if (value.startsWith(ENC_PREFIX)) {
      if (!safeStorage.isEncryptionAvailable()) {
        log.warn('safeStorage unavailable; cannot decrypt stored auth token');
        return null;
      }
      const token = decryptToken(value);
      if (token === null) {
        log.error('Failed to decrypt stored auth token');
      }
      return token;
    }
    log.warn('Reading legacy unencrypted auth token');
    return value;
  });

  ipcMain.handle('auth:delete', () => {
    store.delete(AUTH_TOKEN_KEY);
    return true;
  });

  ipcMain.handle('app:get-version', () => {
    return app.getVersion();
  });

  ipcMain.handle('app:log', (event, level, message) => {
    const safeLevel = ['error', 'warn', 'info', 'debug'].includes(level) ? level : 'info';
    log[safeLevel](`[renderer] ${message}`);
  });
}

module.exports = { registerIpcHandlers, store };
