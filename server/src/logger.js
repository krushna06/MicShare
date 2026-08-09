const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

function resolveLevel() {
  const configured = String(process.env.LOG_LEVEL || 'info').toLowerCase();
  return LEVELS[configured] ?? LEVELS.info;
}

const currentThreshold = resolveLevel();

function timestamp() {
  return new Date().toISOString();
}

function formatMeta(meta) {
  if (meta === undefined) return '';
  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return '';
  }
}

function write(level, levelName, message, meta) {
  if (LEVELS[levelName] < currentThreshold) return;
  const line = `[${timestamp()}] [${levelName.toUpperCase()}] ${message}${formatMeta(meta)}`;
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

const logger = {
  debug(message, meta) {
    write('debug', 'debug', message, meta);
  },
  info(message, meta) {
    write('info', 'info', message, meta);
  },
  warn(message, meta) {
    write('warn', 'warn', message, meta);
  },
  error(message, meta) {
    write('error', 'error', message, meta);
  },
};

module.exports = logger;
