import React from 'react';
import { MicIcon, VirtualMicIcon, HeadphoneIcon } from './icons';
import SelectMenu from './SelectMenu';

const SECTIONS = [
  {
    number: 1,
    title: 'Primary Microphone',
    tag: 'Input',
    icon: MicIcon,
    accent: 'bg-blue-600',
    description: 'The microphone you speak into and share with friends.',
  },
  {
    number: 2,
    title: 'Mic Share Virtual Microphone',
    tag: 'Virtual',
    icon: VirtualMicIcon,
    accent: 'bg-green-600',
    description:
      'VB-CABLE virtual device that routes shared audio into other apps as a microphone.',
  },
  {
    number: 3,
    title: 'Playback',
    tag: 'Speakers / Headphones',
    icon: HeadphoneIcon,
    accent: 'bg-purple-600',
    description: 'The physical output where you hear the other person.',
  },
];

function SectionHeader({ section }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <span
        className={`w-8 h-8 rounded-lg ${section.accent} flex items-center justify-center text-white shrink-0`}
      >
        <section.icon />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-100 leading-tight">
          {section.number}. {section.title}
        </p>
        <p className="text-xs text-gray-500 leading-tight">{section.tag}</p>
      </div>
    </div>
  );
}

export default function DevicesPanel({
  devices,
  inputs,
  virtualCableOutputs,
  playbackOutputs,
  selectedInput,
  selectedOutput,
  selectedPlayback,
  selectInput,
  selectOutput,
  selectPlayback,
  permission,
  error,
  missingInput,
  missingOutput,
  missingPlayback,
}) {
  const inputOptions = inputs.map((d) => ({ value: d.deviceId, label: d.label }));
  const virtualOptions = virtualCableOutputs.map((d) => ({ value: d.deviceId, label: d.label }));
  const playbackOptions = playbackOutputs.map((d) => ({ value: d.deviceId, label: d.label }));

  return (
    <section className="bg-gray-950 border border-gray-800 rounded-lg p-5">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
        Audio devices
      </h3>

      {permission === 'denied' && (
        <p className="text-sm text-amber-400 bg-amber-900/30 rounded px-3 py-2 mb-4">
          Microphone access was denied. Device names stay hidden until access is granted.
        </p>
      )}
      {error && (
        <p className="text-sm text-red-400 bg-red-900/30 rounded px-3 py-2 mb-4">{error}</p>
      )}
      {missingInput && (
        <p className="text-sm text-amber-400 bg-amber-900/30 rounded px-3 py-2 mb-4">
          The selected microphone is no longer connected.
        </p>
      )}
      {missingOutput && (
        <p className="text-sm text-amber-400 bg-amber-900/30 rounded px-3 py-2 mb-4">
          The selected Mic Share virtual microphone is no longer connected.
        </p>
      )}
      {missingPlayback && (
        <p className="text-sm text-amber-400 bg-amber-900/30 rounded px-3 py-2 mb-4">
          The selected playback device is no longer connected.
        </p>
      )}

      {devices === null ? (
        <p className="text-sm text-gray-400">Detecting audio devices…</p>
      ) : devices.length === 0 ? (
        <p className="text-sm text-gray-400">No audio devices found.</p>
      ) : (
        <div className="space-y-6">
          <div className="space-y-1">
            <SectionHeader section={SECTIONS[0]} />
            <p className="text-xs text-gray-500">{SECTIONS[0].description}</p>
            {inputs.length === 0 ? (
              <p className="text-sm text-gray-400 rounded-lg bg-gray-800 px-3 py-2">
                No microphone detected.
              </p>
            ) : (
              <SelectMenu
                value={selectedInput || ''}
                onChange={selectInput}
                placeholder="Select a microphone…"
                options={inputOptions}
              />
            )}
          </div>

          <div className="space-y-1">
            <SectionHeader section={SECTIONS[1]} />
            <p className="text-xs text-gray-500">{SECTIONS[1].description}</p>
            {virtualCableOutputs.length === 0 ? (
              <p className="text-sm text-gray-400 rounded-lg bg-gray-800 px-3 py-2">
                No VB-CABLE device detected. Install VB-CABLE and check that it is plugged in.
              </p>
            ) : (
              <SelectMenu
                value={selectedOutput || ''}
                onChange={selectOutput}
                placeholder="Select a Mic Share device…"
                options={virtualOptions}
              />
            )}
          </div>

          <div className="space-y-1">
            <SectionHeader section={SECTIONS[2]} />
            <p className="text-xs text-gray-500">{SECTIONS[2].description}</p>
            <SelectMenu
              value={selectedPlayback || ''}
              onChange={selectPlayback}
              placeholder="System default (recommended)"
              options={playbackOptions}
            />
            {playbackOutputs.length === 0 && (
              <p className="text-sm text-gray-400 rounded-lg bg-gray-800 px-3 py-2">
                No speakers or headphones detected. Shared audio will use the system default.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
