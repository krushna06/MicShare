import React, { useState } from 'react';
import { useSoundboard } from '../hooks/useSoundboard';
import { formatAccelerator } from '../lib/soundboard';
import { PlayIcon, PlusIcon, TrashIcon, KeyboardIcon, PencilIcon } from './icons';

function KeybindButton({ sound, recording, onStart, onCancel, onRemove }) {
  if (recording) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 border border-amber-500/50 px-2 py-1 text-xs text-amber-300 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Press keys…
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-1 text-xs"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {sound.keybind ? (
        <>
          <span
            className="inline-flex items-center gap-1.5 rounded-md bg-gray-800 border border-gray-700 px-2 py-1 text-xs text-gray-200 font-medium tabular-nums"
            title={`Global keybind: ${sound.keybind}`}
          >
            <KeyboardIcon />
            {formatAccelerator(sound.keybind)}
          </span>
          <button
            type="button"
            onClick={onStart}
            title="Change keybind"
            className="rounded-md bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-100 px-2 py-1 text-xs"
          >
            Change
          </button>
          <button
            type="button"
            onClick={onRemove}
            title="Remove keybind"
            className="rounded-md bg-gray-800 hover:bg-red-600/80 hover:text-white text-gray-400 px-2 py-1 text-xs"
          >
            Remove
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={onStart}
          className="inline-flex items-center gap-1.5 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-gray-100 px-2 py-1 text-xs font-medium"
        >
          <KeyboardIcon />
          Set keybind
        </button>
      )}
    </div>
  );
}

function SoundRow({ sound, soundboard }) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(sound.name);
  const isPlaying = soundboard.playingId === sound.id;
  const isBusy = soundboard.busyId === sound.id;

  const commitName = () => {
    setEditingName(false);
    const next = nameDraft.trim();
    if (next && next !== sound.name) {
      soundboard.rename(sound.id, next);
    } else {
      setNameDraft(sound.name);
    }
  };

  return (
    <li
      className={`rounded-lg border p-3 flex flex-wrap items-center gap-3 ${
        isPlaying ? 'bg-blue-950/40 border-blue-800/60' : 'bg-gray-800/60 border-gray-700'
      }`}
    >
      <button
        type="button"
        onClick={() => soundboard.play(sound.id)}
        title={`Play ${sound.name}`}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
          isPlaying
            ? 'bg-blue-600 hover:bg-blue-500 text-white'
            : 'bg-gray-700 hover:bg-blue-600 text-gray-200 hover:text-white'
        }`}
      >
        <PlayIcon />
      </button>

      {editingName ? (
        <input
          autoFocus
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitName();
            if (e.key === 'Escape') {
              setNameDraft(sound.name);
              setEditingName(false);
            }
          }}
          maxLength={64}
          className="min-w-0 w-40 rounded-md bg-gray-950 border border-blue-500 px-2 py-1 text-sm text-white focus:outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => soundboard.play(sound.id)}
          title={`Play ${sound.name}`}
          className="flex-1 min-w-0 text-left group"
        >
          <span className={`block text-sm truncate ${isPlaying ? 'text-blue-200' : 'text-white'}`}>
            {sound.name}
          </span>
          <span className="block text-xs text-gray-500 group-hover:text-gray-400">
            Click to play
          </span>
        </button>
      )}

      {!editingName && (
        <button
          type="button"
          onClick={() => {
            setNameDraft(sound.name);
            setEditingName(true);
          }}
          title="Rename sound"
          className="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:text-gray-100 hover:bg-gray-700 shrink-0"
        >
          <PencilIcon />
        </button>
      )}

      <KeybindButton
        sound={sound}
        recording={soundboard.recordingKeybindFor === sound.id}
        onStart={() => soundboard.startKeybindCapture(sound.id)}
        onCancel={soundboard.cancelKeybindCapture}
        onRemove={() => soundboard.removeKeybind(sound.id)}
      />

      <button
        type="button"
        onClick={() => soundboard.removeSound(sound.id)}
        disabled={isBusy}
        title="Remove sound"
        className="w-7 h-7 rounded flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-600/20 disabled:opacity-50 shrink-0"
      >
        <TrashIcon />
      </button>
    </li>
  );
}
export default function SoundboardPanel({ routeId, playbackId, devicesLoaded }) {
  const soundboard = useSoundboard({ routeId, playbackId });

  return (
    <section className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4 gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            Soundboard
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Sounds play into your Mic Share virtual microphone.
          </p>
        </div>
        <button
          type="button"
          onClick={soundboard.addSounds}
          disabled={soundboard.busyId === '__add__'}
          className="inline-flex items-center gap-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-3 py-1.5 text-sm font-medium text-white shrink-0"
        >
          <PlusIcon />
          {soundboard.busyId === '__add__' ? 'Adding…' : 'Add Sound'}
        </button>
      </div>

      {soundboard.error && (
        <p className="text-sm text-red-400 bg-red-900/30 rounded px-3 py-2 mb-4 whitespace-pre-line">
          {soundboard.error}
        </p>
      )}

      {devicesLoaded && !routeId && (
        <p className="text-sm text-amber-400 bg-amber-900/30 rounded px-3 py-2 mb-4">
          No Mic Share virtual microphone selected. Sounds will use your default output. Pick one
          in Settings to route sounds to other apps as a microphone.
        </p>
      )}

      {soundboard.loading ? (
        <p className="text-sm text-gray-400">Loading sounds…</p>
      ) : soundboard.sounds.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-700 p-6 text-center">
          <p className="text-sm text-gray-300 font-medium">No sounds yet</p>
          <p className="text-xs text-gray-500 mt-1">
            Add an MP3 to get started. Assign a global keybind to trigger it while using other
            apps.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {soundboard.sounds.map((sound) => (
            <React.Fragment key={sound.id}>
              <SoundRow sound={sound} soundboard={soundboard} />
              <audio
                ref={(el) => soundboard.setAudioEl(sound.id, 'playback', el)}
                src={`micshare-sound://${sound.id}`}
                preload="metadata"
                className="hidden"
              />
              <audio
                ref={(el) => soundboard.setAudioEl(sound.id, 'route', el)}
                src={`micshare-sound://${sound.id}`}
                preload="metadata"
                className="hidden"
                onEnded={() => {
                  if (soundboard.playingId === sound.id) soundboard.setPlayingId(null);
                }}
                onError={() => soundboard.handleAudioError(sound.id)}
              />
            </React.Fragment>
          ))}
        </ul>
      )}
    </section>
  );
}
