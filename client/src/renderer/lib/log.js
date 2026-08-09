function report(level, message) {
  if (!window.micShare || !window.micShare.app || typeof window.micShare.app.log !== 'function') {
    return;
  }
  window.micShare.app.log(level, message).catch(() => {});
}

function describeErrorEvent(event) {
  if (!event || !event.error) return event ? event.message : '';
  return event.error.stack || event.error.message || String(event.error);
}

function describeReason(reason) {
  if (!reason) return String(reason);
  if (reason.stack) return reason.stack;
  if (reason.message) return reason.message;
  return String(reason);
}

export function initErrorReporting() {
  if (initErrorReporting.installed) return;
  initErrorReporting.installed = true;

  window.addEventListener('error', (event) => {
    report('error', `Uncaught error: ${describeErrorEvent(event)}`);
  });

  window.addEventListener('unhandledrejection', (event) => {
    report('error', `Unhandled promise rejection: ${describeReason(event.reason)}`);
  });

  const originalConsoleError = console.error;
  console.error = (...args) => {
    originalConsoleError(...args);
    report('error', args.map(String).join(' '));
  };
}
