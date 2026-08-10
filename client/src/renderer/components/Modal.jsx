import React, { useEffect, useRef, useState } from 'react';

const DURATION = 200;

export default function Modal({ open, onClose, children, maxWidth = 'max-w-xl' }) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);
  const timerRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setVisible(false);
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = requestAnimationFrame(() => setVisible(true));
      });
    } else {
      setVisible(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setMounted(false), DURATION);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [open]);

  useEffect(() => {
    if (!mounted) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div
      className={`modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-6 ${
        visible ? 'modal-backdrop--visible opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidth} bg-gray-900 border border-gray-800 rounded-lg shadow-2xl max-h-[85vh] flex flex-col overflow-hidden transition-all duration-200 ${
          visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
