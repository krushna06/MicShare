import { useCallback, useEffect, useState } from 'react';
import { listAudioDevices, subscribeToDeviceChanges, unlockDeviceLabels } from '../lib/devices';

const INPUT_KEY = 'inputDeviceId';
const OUTPUT_KEY = 'outputDeviceId';
const PLAYBACK_KEY = 'outputPlaybackDeviceId';

export function useDevices() {
  const [devices, setDevices] = useState(null);
  const [permission, setPermission] = useState('checking');
  const [selectedInput, setSelectedInput] = useState(null);
  const [selectedOutput, setSelectedOutput] = useState(null);
  const [selectedPlayback, setSelectedPlayback] = useState(null);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const list = await listAudioDevices();
      setDevices(list);
      setError(null);
      return list;
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const unlocked = await unlockDeviceLabels();
      if (!mounted) return;
      setPermission(unlocked ? 'granted' : 'denied');
      const list = await refresh();

      const [inputId, outputId, playbackId] = await Promise.all([
        window.micShare?.settings?.get(INPUT_KEY),
        window.micShare?.settings?.get(OUTPUT_KEY),
        window.micShare?.settings?.get(PLAYBACK_KEY),
      ]);
      if (!mounted) return;

      const savedInput = typeof inputId === 'string' ? inputId : null;
      const savedOutput = typeof outputId === 'string' ? outputId : null;
      const savedPlayback = typeof playbackId === 'string' ? playbackId : null;

      if (savedInput) {
        setSelectedInput(savedInput);
      } else {
        const defaultInput = list.find((d) => d.kind === 'input' && !d.isVirtualCable);
        if (defaultInput) {
          setSelectedInput(defaultInput.deviceId);
          persistSelection(INPUT_KEY, defaultInput.deviceId);
        }
      }

      if (savedOutput) {
        setSelectedOutput(savedOutput);
      } else {
        const defaultOutput = list.find((d) => d.kind === 'output' && d.isVirtualCable);
        if (defaultOutput) {
          setSelectedOutput(defaultOutput.deviceId);
          persistSelection(OUTPUT_KEY, defaultOutput.deviceId);
        }
      }

      if (savedPlayback) {
        setSelectedPlayback(savedPlayback);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [refresh, persistSelection]);

  useEffect(() => {
    const unsubscribe = subscribeToDeviceChanges(() => {
      refresh();
    });
    return unsubscribe;
  }, [refresh]);

  const persistSelection = useCallback(async (key, value) => {
    try {
      if (value) {
        await window.micShare?.settings?.set(key, value);
      } else {
        await window.micShare?.settings?.delete(key);
      }
    } catch {
    }
  }, []);

  const selectInput = useCallback(async (deviceId) => {
    setSelectedInput(deviceId || null);
    await persistSelection(INPUT_KEY, deviceId || null);
  }, [persistSelection]);

  const selectOutput = useCallback(async (deviceId) => {
    setSelectedOutput(deviceId || null);
    await persistSelection(OUTPUT_KEY, deviceId || null);
  }, [persistSelection]);

  const selectPlayback = useCallback(async (deviceId) => {
    setSelectedPlayback(deviceId || null);
    await persistSelection(PLAYBACK_KEY, deviceId || null);
  }, [persistSelection]);

  const inputs = (devices || []).filter((d) => d.kind === 'input');
  const outputs = (devices || []).filter((d) => d.kind === 'output');
  const virtualCableOutputs = outputs.filter((d) => d.isVirtualCable);
  const playbackOutputs = outputs.filter((d) => !d.isVirtualCable);

  const inputAvailable = inputs.some((d) => d.deviceId === selectedInput);
  const outputAvailable = virtualCableOutputs.some((d) => d.deviceId === selectedOutput);
  const playbackAvailable = playbackOutputs.some((d) => d.deviceId === selectedPlayback);

  return {
    devices,
    inputs,
    outputs,
    virtualCableOutputs,
    playbackOutputs,
    selectedInput: inputAvailable ? selectedInput : null,
    selectedOutput: outputAvailable ? selectedOutput : null,
    selectedPlayback: playbackAvailable ? selectedPlayback : null,
    selectInput,
    selectOutput,
    selectPlayback,
    permission,
    error,
    missingInput: selectedInput !== null && !inputAvailable,
    missingOutput: selectedOutput !== null && !outputAvailable,
    missingPlayback: selectedPlayback !== null && !playbackAvailable,
  };
}
