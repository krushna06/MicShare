import { useCallback, useEffect, useState } from 'react';

const KEYS = {
  url: 'rtcTurnUrl',
  username: 'rtcTurnUsername',
  password: 'rtcTurnPassword',
  custom: 'rtcTurnCustom',
};

export const DEFAULT_ICE_SERVERS = [
  {
    urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'],
  },
];

export const DEFAULT_TURN = {
  url: 'turn:voice.nostep.space:3478',
  username: 'turnuser',
  credential: 'mic_share_turn1212',
};

export function useRtcConfig() {
  const [turn, setTurn] = useState(null);
  const [custom, setCustom] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [url, username, credential, customRaw] = await Promise.all([
        window.micShare?.settings?.get(KEYS.url),
        window.micShare?.settings?.get(KEYS.username),
        window.micShare?.settings?.get(KEYS.password),
        window.micShare?.settings?.get(KEYS.custom),
      ]);
      if (!mounted) return;
      setCustom(customRaw === true || customRaw === 'true');
      if (typeof url === 'string' && url.trim()) {
        setTurn({
          url: url.trim(),
          username: typeof username === 'string' ? username : '',
          credential: typeof credential === 'string' ? credential : '',
        });
      }
      setLoaded(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const save = useCallback(async (next) => {
    const clean =
      next && next.url && next.url.trim()
        ? {
            url: next.url.trim(),
            username: (next.username || '').trim(),
            credential: (next.password || '').trim(),
          }
        : null;
    const useCustom = Boolean(next && next.custom);
    await Promise.all([
      window.micShare?.settings?.set(KEYS.custom, useCustom),
      window.micShare?.settings?.set(KEYS.url, clean ? clean.url : ''),
      window.micShare?.settings?.set(KEYS.username, clean ? clean.username : ''),
      window.micShare?.settings?.set(KEYS.password, clean ? clean.credential : ''),
    ]);
    setCustom(useCustom);
    setTurn(clean);
    return { custom: useCustom, turn: clean };
  }, []);

  const iceServers = useCallback(() => {
    const servers = [{ ...DEFAULT_ICE_SERVERS[0] }];
    const customTurn = turn && turn.url ? turn : null;
    const entry = custom && customTurn ? customTurn : DEFAULT_TURN;
    const ice = { urls: [entry.url] };
    if (entry.username) ice.username = entry.username;
    if (entry.credential) ice.credential = entry.credential;
    servers.push(ice);
    return servers;
  }, [turn, custom]);

  return { turn, custom, loaded, save, iceServers };
}
