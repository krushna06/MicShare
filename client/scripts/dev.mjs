import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import http from 'node:http';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientRoot = path.resolve(__dirname, '..');

const VITE_PORT = process.env.CLIENT_DEV_PORT || 5173;
const DEV_URL = `http://localhost:${VITE_PORT}`;

function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timed out waiting for ${url}`));
        } else {
          setTimeout(attempt, 500);
        }
      });
    };
    attempt();
  });
}

function run(command, args, env = {}) {
  return spawn(command, args, {
    cwd: clientRoot,
    env: { ...process.env, ...env },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
}

async function main() {
  const viteProcess = run('npx', ['vite', '--port', String(VITE_PORT), '--strictPort']);

  try {
    await waitForServer(DEV_URL);
    console.log(`[client] Vite ready at ${DEV_URL}`);

    const electronBinary = require('electron');
    const electron = run(electronBinary, ['.'], { VITE_DEV_SERVER_URL: DEV_URL });

    viteProcess.on('exit', (code) => {
      electron.kill();
      process.exit(code ?? 0);
    });
    electron.on('exit', (code) => {
      viteProcess.kill();
      process.exit(code ?? 0);
    });
  } catch (err) {
    console.error('[client]', err.message);
    viteProcess.kill();
    process.exit(1);
  }
}

main();
