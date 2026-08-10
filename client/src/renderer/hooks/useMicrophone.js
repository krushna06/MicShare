import { useCallback, useEffect, useRef, useState } from 'react';
import { setupRnnoise } from '../lib/noiseSuppression';

function describeMediaError(err) {
  switch (err.name) {
    case 'NotAllowedError':
      return 'Microphone access was denied. Enable it in the permission prompt to capture audio.';
    case 'NotFoundError':
      return 'No microphone was found on this system.';
    case 'NotReadableError':
      return 'The microphone is in use by another application. Close it and try again.';
    case 'OverconstrainedError':
      return 'The selected microphone is no longer available.';
    default:
      return err.message || 'Microphone capture failed';
  }
}

export function useMicrophone(selectedInput, inputs, noiseSuppression = 'builtin') {
  const [capturing, setCapturing] = useState(false);
  const [level, setLevel] = useState(0);
  const [format, setFormat] = useState(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [muted, setMuted] = useState(false);

  const streamRef = useRef(null);
  const rawStreamRef = useRef(null);
  const contextRef = useRef(null);
  const analyserRef = useRef(null);
  const levelTimerRef = useRef(null);
  const mutedRef = useRef(false);
  const noiseNodeRef = useRef(null);

  const toggleMute = useCallback(() => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    const track = streamRef.current && streamRef.current.getAudioTracks()[0];
    if (track) track.enabled = !next;
  }, []);

  const stop = useCallback(() => {
    if (levelTimerRef.current) clearInterval(levelTimerRef.current);
    levelTimerRef.current = null;
    if (noiseNodeRef.current) {
      try {
        noiseNodeRef.current.disconnect();
      } catch {
      }
      if (typeof noiseNodeRef.current.destroy === 'function') {
        noiseNodeRef.current.destroy();
      }
      noiseNodeRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (rawStreamRef.current) {
      rawStreamRef.current.getTracks().forEach((track) => track.stop());
      rawStreamRef.current = null;
    }
    if (contextRef.current) {
      contextRef.current.close().catch(() => {});
      contextRef.current = null;
    }
    analyserRef.current = null;
    setLevel(0);
    setStream(null);
    setCapturing(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    stop();
    try {
      const useRnnoise = noiseSuppression === 'rnnoise';
      const audio = {
        ...(selectedInput ? { deviceId: { exact: selectedInput } } : {}),
        noiseSuppression: noiseSuppression === 'builtin',
      };
      const raw = await navigator.mediaDevices.getUserMedia({ audio, video: false });
      const track = raw.getAudioTracks()[0];
      if (!track) {
        raw.getTracks().forEach((t) => t.stop());
        throw new Error('No microphone track was returned by the system');
      }
      rawStreamRef.current = raw;

      const context = new AudioContext(useRnnoise ? { sampleRate: 48000 } : undefined);
      contextRef.current = context;
      const source = context.createMediaStreamSource(raw);
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      const silent = context.createGain();
      silent.gain.value = 0;

      let outStream = raw;
      if (useRnnoise) {
        try {
          const node = await setupRnnoise(context);
          noiseNodeRef.current = node;
          const destination = context.createMediaStreamDestination();
          source.connect(node);
          node.connect(destination);
          node.connect(analyser);
          outStream = destination.stream;
        } catch (err) {
          window.micShare?.app?.log?.('warn', `RNNoise setup failed: ${err.message}`);
          source.connect(analyser);
        }
      } else {
        source.connect(analyser);
      }
      analyser.connect(silent);
      silent.connect(context.destination);

      streamRef.current = outStream;
      track.enabled = !mutedRef.current;
      setStream(outStream);
      analyserRef.current = analyser;

      if (context.state === 'suspended') {
        await context.resume();
      }

      const settings = track.getSettings();
      const device = inputs.find((d) => d.deviceId === selectedInput) || null;
      setFormat({
        label: device ? device.label : null,
        sampleRate: settings.sampleRate || context.sampleRate,
        channelCount: settings.channelCount || 1,
      });

      track.onended = () => {
        stop();
        setError('Microphone capture ended because the device disconnected.');
      };

      const samples = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (let i = 0; i < samples.length; i += 1) {
          const v = (samples[i] - 128) / 128;
          sum += v * v;
        }
        setLevel(Math.min(1, Math.sqrt(sum / samples.length)));
      };
      levelTimerRef.current = setInterval(tick, 50);

      setCapturing(true);
      return outStream;
    } catch (err) {
      stop();
      const message = describeMediaError(err);
      setError(message);
      throw new Error(message);
    }
  }, [selectedInput, inputs, noiseSuppression, stop]);

  useEffect(() => stop, [stop]);

  const prevInputRef = useRef(selectedInput);
  useEffect(() => {
    const prev = prevInputRef.current;
    prevInputRef.current = selectedInput;
    if (prev === selectedInput) return;
    if (streamRef.current) start();
  }, [selectedInput, start]);

  const prevNoiseRef = useRef(noiseSuppression);
  useEffect(() => {
    const prev = prevNoiseRef.current;
    prevNoiseRef.current = noiseSuppression;
    if (prev === noiseSuppression) return;
    if (streamRef.current) start();
  }, [noiseSuppression, start]);

  return { capturing, level, format, stream, error, start, stop, muted, toggleMute };
}
