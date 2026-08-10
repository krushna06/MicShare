import { useEffect, useRef, useState } from 'react';

export function useAnimatedMount(open, duration = 200) {
  const [render, setRender] = useState(open);
  const [visible, setVisible] = useState(open);
  const rafRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (open) {
      setRender(true);
      setVisible(false);
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = requestAnimationFrame(() => setVisible(true));
      });
    } else {
      setVisible(false);
      timerRef.current = setTimeout(() => setRender(false), duration);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [open, duration]);

  return { render, visible };
}
