import React, { useCallback, useEffect, useRef, useState } from 'react';

export default function SelectMenu({ value, onChange, placeholder, options, className }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);

  const selected = options.find((o) => o.value === value);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setOpen((current) => !current);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (rootRef.current && rootRef.current.contains(event.target)) return;
      close();
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopImmediatePropagation();
        close();
      }
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('blur', close);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('blur', close);
    };
  }, [open, close]);

  const handleSelect = (option) => {
    if (option.value !== value) onChange(option.value);
    close();
  };

  const baseClass =
    'w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-left focus:outline-none flex items-center justify-between gap-2';
  const stateClass = selected ? 'text-white' : 'text-gray-500';

  return (
    <div ref={rootRef} className={`relative ${className || ''}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${baseClass} ${stateClass} ${open ? 'border-blue-500' : 'hover:border-gray-600'}`}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <svg
          className="w-4 h-4 shrink-0 text-gray-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute z-30 top-full left-0 right-0 mt-1 rounded-lg bg-gray-900 border border-gray-700 shadow-2xl overflow-y-auto max-h-72 py-1"
        >
          {options.length === 0 && (
            <p className="px-3 py-2 text-sm text-gray-500">No options available</p>
          )}
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => handleSelect(option)}
              className={`block w-full text-left px-3 py-2 text-sm truncate hover:bg-gray-800 ${
                option.value === value ? 'text-white bg-gray-800' : 'text-gray-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
