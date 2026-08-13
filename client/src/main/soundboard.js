const {
  ipcMain,
  dialog,
  BrowserWindow,
  globalShortcut,
  protocol,
  net,
  app,
} = require('electron');
const Store = require('electron-store');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const log = require('electron-log');

const SOUND_SCHEME = 'micshare-sound';
const SOUNDS_KEY = 'sounds';
const ID_PATTERN = /^[0-9a-f]{32}$/;

const MODIFIER_VKEYS = new Set([
  0x10, 0x11, 0x12, 0x5b, 0x5c, 0xa0, 0xa1, 0xa2, 0xa3, 0xa4, 0xa5,
]);

const store = new Store({ name: 'micshare-soundboard' });
const shortcuts = new Map();
const localKeys = new Map();
const downKeys = new Set();
let keyListener = null;
let globalListenerActive = false;

function soundsDir() {
  return path.join(app.getPath('userData'), 'sounds');
}

function getSounds() {
  const list = store.get(SOUNDS_KEY);
  return Array.isArray(list) ? list : [];
}

function saveSounds(list) {
  store.set(SOUNDS_KEY, list);
}

function getSound(id) {
  return getSounds().find((s) => s.id === id) || null;
}

function updateSound(id, patch) {
  const next = getSounds().map((s) => (s.id === id ? { ...s, ...patch } : s));
  saveSounds(next);
  return getSound(id);
}

function soundFile(id) {
  return path.join(soundsDir(), `${id}.mp3`);
}

function unregisterShortcut(soundId) {
  for (const [accelerator, entry] of shortcuts.entries()) {
    if (entry.soundId === soundId) {
      try {
        globalShortcut.unregister(accelerator);
      } catch {
      }
      shortcuts.delete(accelerator);
    }
  }
  for (const [vKey, id] of localKeys.entries()) {
    if (id === soundId) localKeys.delete(vKey);
  }
}

function acceleratorToVKey(accelerator) {
  const name = String(accelerator).split('+').pop();
  if (/^[A-Z]$/.test(name)) return name.charCodeAt(0);
  if (/^[0-9]$/.test(name)) return 0x30 + Number(name);
  if (/^F(?:[1-9]|1[0-9]|2[0-4])$/.test(name)) return 0x6f + Number(name.slice(1));
  if (/^num[0-9]$/.test(name)) return 0x60 + Number(name.slice(3));
  const special = {
    Backspace: 0x08,
    Tab: 0x09,
    Enter: 0x0d,
    Esc: 0x1b,
    Space: 0x20,
    PageUp: 0x21,
    PageDown: 0x22,
    End: 0x23,
    Home: 0x24,
    Left: 0x25,
    Up: 0x26,
    Right: 0x27,
    Down: 0x28,
    Insert: 0x2d,
    Delete: 0x2e,
    ';': 0xba,
    '=': 0xbb,
    ',': 0xbc,
    '-': 0xbd,
    '.': 0xbe,
    '/': 0xbf,
    '`': 0xc0,
    '[': 0xdb,
    '\\': 0xdc,
    ']': 0xdd,
    "'": 0xde,
  };
  return special[name] ?? null;
}

function sendPlay(soundId) {
  const win = getWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send('soundboard:play', soundId);
  }
}

function modifierDown() {
  for (const v of MODIFIER_VKEYS) {
    if (downKeys.has(v)) return true;
  }
  return false;
}

function onGlobalKey(event) {
  const vKey = event.vKey;
  if (event.state === 'DOWN') {
    if (downKeys.has(vKey)) return;
    downKeys.add(vKey);
    if (!MODIFIER_VKEYS.has(vKey) && !modifierDown()) {
      const soundId = localKeys.get(vKey);
      if (soundId) sendPlay(soundId);
    }
  } else if (event.state === 'UP') {
    downKeys.delete(vKey);
  }
}

function resolveKeyServerPath() {
  try {
    const indexPath = require.resolve('node-global-key-listener');
    const exe = path.join(path.dirname(indexPath), '..', 'bin', 'WinKeyServer.exe');
    const unpacked = exe.replace('app.asar' + path.sep, 'app.asar.unpacked' + path.sep);
    return unpacked !== exe && fs.existsSync(unpacked) ? unpacked : exe;
  } catch {
    return null;
  }
}

function startGlobalKeyListener() {
  if (keyListener) return;
  try {
    const { GlobalKeyboardListener } = require('node-global-key-listener');
    const listener = new GlobalKeyboardListener({
      windows: { serverPath: resolveKeyServerPath() || undefined },
    });
    listener
      .addListener(onGlobalKey)
      .then(() => {
        globalListenerActive = true;
        log.info('Soundboard global key listener started');
        sendListenerStatus();
      })
      .catch((err) => {
        globalListenerActive = false;
        log.error('Failed to start soundboard global key listener', {
          error: err && err.message,
        });
        sendListenerStatus();
      });
    keyListener = listener;
  } catch (err) {
    globalListenerActive = false;
    log.error('Failed to load soundboard global key listener', { error: err.message });
  }
}

function stopGlobalKeyListener() {
  if (keyListener) {
    try {
      keyListener.kill();
    } catch {
    }
    keyListener = null;
  }
  globalListenerActive = false;
}

function sendListenerStatus() {
  const win = getWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send('soundboard:global-listener-status', globalListenerActive);
  }
}

function hasModifier(accelerator) {
  return /^(CommandOrControl|CmdOrCtrl|Control|Ctrl|Alt|Shift|Super|Cmd|Command|Meta)\+/.test(
    accelerator
  );
}

function registerShortcut(soundId, accelerator) {
  unregisterShortcut(soundId);
  if (!accelerator) return { ok: true };

  const existing = shortcuts.get(accelerator);
  if (existing && existing.soundId !== soundId) {
    return { ok: false, error: 'That keybind is already assigned to another sound.' };
  }

  if (!hasModifier(accelerator)) {
    const clash = getSounds().find((s) => s.id !== soundId && s.keybind === accelerator);
    if (clash) {
      return { ok: false, error: 'That keybind is already assigned to another sound.' };
    }
    const vKey = acceleratorToVKey(accelerator);
    if (vKey == null) {
      return { ok: false, error: `Unable to register keybind "${accelerator}".` };
    }
    localKeys.set(vKey, soundId);
    startGlobalKeyListener();
    return { ok: true };
  }

  let registered = false;
  try {
    registered = globalShortcut.register(accelerator, () => {
      const win = getWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send('soundboard:play', soundId);
      }
    });
  } catch (err) {
    log.error('Failed to register soundboard shortcut', { accelerator, error: err.message });
  }

  if (!registered) {
    return {
      ok: false,
      error: `Unable to register global keybind "${accelerator}". It may already be in use by another application.`,
    };
  }

  shortcuts.set(accelerator, { soundId });
  return { ok: true };
}

let getWindow = () => null;

function registerSoundboardScheme() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: SOUND_SCHEME,
      privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
    },
  ]);
}

function initSoundboard(windowGetter) {
  getWindow = windowGetter;

  protocol.handle(SOUND_SCHEME, async (request) => {
    try {
      const url = new URL(request.url);
      const id = url.hostname;
      if (!ID_PATTERN.test(id)) return new Response('Not found', { status: 404 });
      const file = soundFile(id);
      if (!fs.existsSync(file)) return new Response('Not found', { status: 404 });
      try {
        return await net.fetch(pathToFileURL(file).toString());
      } catch {
        return new Response(fs.readFileSync(file), {
          headers: { 'content-type': 'audio/mpeg' },
        });
      }
    } catch (err) {
      log.error('Failed to serve soundboard file', { error: err.message });
      return new Response('Bad request', { status: 400 });
    }
  });

  ipcMain.handle('soundboard:list', () => {
    return getSounds();
  });

  ipcMain.handle('soundboard:get-global-listener', () => globalListenerActive);

  ipcMain.handle('soundboard:pick', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(win, {
      title: 'Choose MP3 files to add to your soundboard',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'MP3 audio', extensions: ['mp3'] }],
    });
    if (result.canceled || result.filePaths.length === 0) return [];

    const dir = soundsDir();
    fs.mkdirSync(dir, { recursive: true });

    const added = [];
    for (const filePath of result.filePaths) {
      const id = crypto.randomBytes(16).toString('hex');
      const dest = soundFile(id);
      fs.copyFileSync(filePath, dest);
      added.push({
        id,
        name: path.basename(filePath, path.extname(filePath)) || 'Sound',
        keybind: null,
        createdAt: Date.now(),
      });
    }

    saveSounds([...getSounds(), ...added]);
    return added;
  });

  ipcMain.handle('soundboard:rename', (event, id, name) => {
    const clean = String(name || '').trim().slice(0, 64) || 'Sound';
    return updateSound(id, { name: clean });
  });

  ipcMain.handle('soundboard:set-keybind', (event, id, accelerator) => {
    const clean = typeof accelerator === 'string' ? accelerator.trim() : '';
    const sound = getSound(id);
    if (!sound) return { ok: false, error: 'Sound not found.' };
    const result = registerShortcut(id, clean);
    if (!result.ok) return result;
    updateSound(id, { keybind: clean });
    return { ok: true, keybind: clean };
  });

  ipcMain.handle('soundboard:remove-keybind', (event, id) => {
    unregisterShortcut(id);
    updateSound(id, { keybind: null });
    return { ok: true };
  });

  ipcMain.handle('soundboard:delete', (event, id) => {
    unregisterShortcut(id);
    const sound = getSound(id);
    if (sound) {
      try {
        fs.unlinkSync(soundFile(id));
      } catch {
      }
    }
    saveSounds(getSounds().filter((s) => s.id !== id));
    return { ok: true };
  });

  getSounds().forEach((sound) => {
    if (sound.keybind) {
      const result = registerShortcut(sound.id, sound.keybind);
      if (!result.ok) {
        log.warn('Could not restore soundboard keybind on startup', {
          sound: sound.name,
          keybind: sound.keybind,
          error: result.error,
        });
      }
    }
  });

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    stopGlobalKeyListener();
  });
}

module.exports = { registerSoundboardScheme, initSoundboard };
