function codeToKey(code) {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (/^F(?:[1-9]|1[0-9]|2[0-4])$/.test(code)) return code;
  const punctuation = {
    Minus: '-',
    Equal: '=',
    BracketLeft: '[',
    BracketRight: ']',
    Backslash: '\\',
    IntlBackslash: '\\',
    Semicolon: ';',
    Quote: "'",
    Backquote: '`',
    Comma: ',',
    Period: '.',
    Slash: '/',
  };
  const special = {
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    Space: 'Space',
    Enter: 'Enter',
    NumpadEnter: 'Enter',
    Tab: 'Tab',
    Escape: 'Esc',
    Backspace: 'Backspace',
    Delete: 'Delete',
    Insert: 'Insert',
    Home: 'Home',
    End: 'End',
    PageUp: 'PageUp',
    PageDown: 'PageDown',
    Numpad0: 'num0',
    Numpad1: 'num1',
    Numpad2: 'num2',
    Numpad3: 'num3',
    Numpad4: 'num4',
    Numpad5: 'num5',
    Numpad6: 'num6',
    Numpad7: 'num7',
    Numpad8: 'num8',
    Numpad9: 'num9',
  };
  return punctuation[code] || special[code] || null;
}

export function buildAccelerator(event) {
  let key = codeToKey(event.code);
  if (!key && typeof event.key === 'string' && event.key.length === 1) key = event.key;
  if (!key) return null;
  const parts = [];
  if (event.ctrlKey) parts.push('CommandOrControl');
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');
  if (event.metaKey) parts.push('Super');
  parts.push(key);
  return parts.join('+');
}

export function formatAccelerator(accelerator) {
  return String(accelerator || '')
    .replace(/CommandOrControl/g, 'Ctrl')
    .replace(/Super/g, 'Win');
}
