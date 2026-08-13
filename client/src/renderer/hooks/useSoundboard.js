import { useCallback, useEffect, useRef, useState } from 'react';
import { buildAccelerator } from '../lib/soundboard';

function soundUrl(id) {
  return `micshare-sound://${id}`;
}

const MODIFIER_KEYS = new Set(['Control', 'Alt', 'Shift', 'Meta', 'CapsLock', 'NumLock']);

export function useSoundboard({ routeId, playbackId }) {
  const [sounds, setSounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recordingKeybindFor, setRecordingKeybindFor] = useState(null);
  const [playingId, setPlayingId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [globalListenerActive, setGlobalListenerActive] = useState(false);

  const soundsRef = useRef(sounds);
  const elsRef = useRef({});

  useEffect(() => {
    soundsRef.current = sounds;
  }, [sounds]);

  const refresh = useCallback(async () => {
    try {
      const list = await window.micShare?.soundboard?.list();
      if (Array.isArray(list)) setSounds(list);
    } catch (err) {
      setError(err.message || 'Failed to load soundboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setAudioEl = useCallback(
    (soundId, kind, el) => {
      const entry = elsRef.current[soundId] || { playback: null, route: null };
      if (!el) {
        entry[kind] = null;
        if (!entry.playback && !entry.route) delete elsRef.current[soundId];
      } else {
        if (!el.dataset.micshareLoaded) {
          el.src = soundUrl(soundId);
          el.dataset.micshareLoaded = '1';
        }
        entry[kind] = el;
        elsRef.current[soundId] = entry;
        const target = kind === 'route' ? routeId : playbackId;
        if (target && typeof el.setSinkId === 'function' && el.sinkId !== target) {
          el.setSinkId(target).catch(() => {});
        }
      }
    },
    [routeId, playbackId]
  );

  useEffect(() => {
    Object.keys(elsRef.current).forEach((soundId) => {
      const entry = elsRef.current[soundId];
      if (entry.route && routeId && typeof entry.route.setSinkId === 'function') {
        entry.route.setSinkId(routeId).catch(() => {});
      }
      if (entry.playback && playbackId && typeof entry.playback.setSinkId === 'function') {
        entry.playback.setSinkId(playbackId).catch(() => {});
      }
    });
  }, [routeId, playbackId]);

  const play = useCallback((soundId) => {
    const sound = soundsRef.current.find((s) => s.id === soundId);
    if (!sound) return;
    const entry = elsRef.current[soundId];
    if (!entry || (!entry.route && !entry.playback)) return;
    [entry.route, entry.playback].forEach((el) => {
      if (!el) return;
      el.currentTime = 0;
      el.play().catch(() => {});
    });
    setPlayingId(soundId);
  }, []);

  useEffect(() => {
    if (!window.micShare?.soundboard?.onPlay) return undefined;
    return window.micShare.soundboard.onPlay((soundId) => {
      play(soundId);
    });
  }, [play]);

  useEffect(() => {
    let active = true;
    window.micShare?.soundboard
      ?.getGlobalListenerActive?.()
      .then((value) => {
        if (active) setGlobalListenerActive(!!value);
      })
      .catch(() => {});
    const unsubscribe = window.micShare?.soundboard?.onGlobalListenerStatus?.((value) => {
      if (active) setGlobalListenerActive(!!value);
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (globalListenerActive) return;
      if (recordingKeybindFor) return;
      if (event.repeat) return;
      if (MODIFIER_KEYS.has(event.key)) return;
      if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
      const accelerator = buildAccelerator(event);
      if (!accelerator) return;
      const sound = soundsRef.current.find((s) => s.keybind === accelerator);
      if (sound) play(sound.id);
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [play, recordingKeybindFor, globalListenerActive]);

  const addSounds = useCallback(async () => {
    setError(null);
    setBusyId('__add__');
    try {
      const added = await window.micShare?.soundboard?.pickFiles();
      if (Array.isArray(added) && added.length > 0) {
        await refresh();
      }
    } catch (err) {
      setError(err.message || 'Failed to add sound.');
    } finally {
      setBusyId(null);
    }
  }, [refresh]);

  const rename = useCallback(async (id, name) => {
    try {
      const updated = await window.micShare?.soundboard?.rename(id, name);
      setSounds((prev) => prev.map((s) => (s.id === id ? updated || s : s)));
    } catch (err) {
      setError(err.message || 'Failed to rename sound.');
    }
  }, []);

  const removeSound = useCallback(
    async (id) => {
      setBusyId(id);
      try {
        await window.micShare?.soundboard?.delete(id);
        setSounds((prev) => prev.filter((s) => s.id !== id));
        delete elsRef.current[id];
        if (playingId === id) setPlayingId(null);
      } catch (err) {
        setError(err.message || 'Failed to remove sound.');
      } finally {
        setBusyId(null);
      }
    },
    [playingId]
  );

  const startKeybindCapture = useCallback((soundId) => {
    setError(null);
    setRecordingKeybindFor(soundId);
  }, []);

  const cancelKeybindCapture = useCallback(() => {
    setRecordingKeybindFor(null);
  }, []);

  const applyKeybind = useCallback(async (soundId, accelerator) => {
    try {
      const result = await window.micShare?.soundboard?.setKeybind(soundId, accelerator);
      if (result && result.ok === false) {
        setError(result.error || 'Failed to set keybind.');
        return false;
      }
      setSounds((prev) =>
        prev.map((s) => (s.id === soundId ? { ...s, keybind: accelerator } : s))
      );
      return true;
    } catch (err) {
      setError(err.message || 'Failed to set keybind.');
      return false;
    }
  }, []);

  const removeKeybind = useCallback(async (soundId) => {
    try {
      await window.micShare?.soundboard?.removeKeybind(soundId);
      setSounds((prev) => prev.map((s) => (s.id === soundId ? { ...s, keybind: null } : s)));
    } catch (err) {
      setError(err.message || 'Failed to remove keybind.');
    }
  }, []);

  const handleAudioError = useCallback((soundId) => {
    const sound = soundsRef.current.find((s) => s.id === soundId);
    setError(
      sound
        ? `"${sound.name}" could not be played. The audio file may be corrupted or not a valid MP3.`
        : 'A sound could not be played.'
    );
  }, []);

  useEffect(() => {
    if (!recordingKeybindFor) return undefined;
    const onKeyDown = (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.code === 'Escape') {
        setRecordingKeybindFor(null);
        return;
      }
      if (MODIFIER_KEYS.has(event.key)) return;
      const accelerator = buildAccelerator(event);
      setRecordingKeybindFor(null);
      if (accelerator) {
        applyKeybind(recordingKeybindFor, accelerator);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [recordingKeybindFor, applyKeybind]);

  return {
    sounds,
    loading,
    error,
    playingId,
    busyId,
    recordingKeybindFor,
    addSounds,
    rename,
    play,
    removeSound,
    startKeybindCapture,
    cancelKeybindCapture,
    applyKeybind,
    removeKeybind,
    setAudioEl,
    setPlayingId,
    handleAudioError,
  };
}
