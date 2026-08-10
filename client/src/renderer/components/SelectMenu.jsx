import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckIcon, ChevronDownIcon } from './icons';

const DURATION = 120;
const GAP = 6;

export default function SelectMenu({ value, onChange, options, placeholder = 'Select…', disabled = false }) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [coords, setCoords] = useState(null);
  const containerRef = useRef(null);
  const menuRef = useRef(null);
  const closeTimerRef = useRef(null);

  const selected = options.find((o) => o.value === value);

  const updatePosition = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({ top: rect.bottom + GAP, left: rect.left, width: rect.width });
  }, []);

  const closeMenu = useCallback(() => {
    setClosing(true);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      setClosing(false);
      setHighlighted(-1);
      setCoords(null);
    }, DURATION);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    updatePosition();
    setHighlighted(Math.max(0, options.findIndex((o) => o.value === value)));
    const onPointerDown = (e) => {
      const inside =
        (containerRef.current && containerRef.current.contains(e.target)) ||
        (menuRef.current && menuRef.current.contains(e.target));
      if (!inside) closeMenu();
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeMenu();
    };
    const reposition = () => updatePosition();
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', reposition);
    document.addEventListener('scroll', reposition, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', reposition);
      document.removeEventListener('scroll', reposition, true);
    };
  }, [open, options, value, closeMenu, updatePosition]);

  const openMenu = () => {
    if (disabled) return;
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setOpen(true);
    setClosing(false);
    updatePosition();
  };

  const select = (option) => {
    if (option.value !== value) onChange(option.value);
    closeMenu();
  };

  const handleListKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => (h + 1) % options.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => (h - 1 + options.length) % options.length);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setHighlighted(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setHighlighted(options.length - 1);
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault();
      const option = options[highlighted];
      if (option) select(option);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={open ? closeMenu : openMenu}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            openMenu();
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-disabled={disabled}
        className={`w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-50 flex items-center justify-between gap-2 text-left ${
          open ? 'border-blue-500' : 'hover:border-gray-600'
        }`}
      >
        <span className={`truncate ${selected ? 'text-white' : 'text-gray-500'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDownIcon
          className={`w-4 h-4 shrink-0 text-gray-400 transition-transform duration-150 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open &&
        coords &&
        createPortal(
          <ul
            ref={menuRef}
            role="listbox"
            tabIndex={-1}
            onKeyDown={handleListKeyDown}
            style={{ top: coords.top, left: coords.left, width: coords.width }}
            className={`fixed z-50 max-h-60 overflow-y-auto rounded-lg bg-gray-800 border border-gray-700 shadow-xl py-1 origin-top transition-all duration-150 ${
              closing ? 'opacity-0 scale-95 -translate-y-1' : 'opacity-100 scale-100 translate-y-0'
            }`}
          >
            {options.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-500">No options available</li>
            )}
            {options.map((option, index) => {
              const active = index === highlighted;
              const isSelected = option.value === value;
              return (
                <li key={String(option.value)} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => select(option)}
                    onMouseEnter={() => setHighlighted(index)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left transition-colors ${
                      active ? 'bg-blue-600 text-white' : 'text-gray-200'
                    }`}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && (
                      <CheckIcon
                        className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-blue-500'}`}
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body
        )}
    </div>
  );
}
