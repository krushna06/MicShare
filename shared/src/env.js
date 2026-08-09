const path = require('node:path');
const fs = require('node:fs');
const dotenv = require('dotenv');

let envLoaded = false;

function findProjectRoot(startDir = process.cwd()) {
  let dir = path.resolve(startDir);
  for (;;) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      const pkgPath = path.join(dir, 'package.json');
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.name === 'mic-share') return dir;
      } catch {
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function loadEnv() {
  if (envLoaded) return process.env.MIC_SHARE_ENV_FILE || null;
  const root = findProjectRoot();
  const envFile = root ? path.join(root, '.env') : null;
  if (envFile && fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
    process.env.MIC_SHARE_ENV_FILE = envFile;
  }
  envLoaded = true;
  return envFile;
}

module.exports = { loadEnv, findProjectRoot };
