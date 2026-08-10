import React, { useEffect } from 'react';
import { MicIcon, HeadphoneIcon, VirtualMicIcon } from './icons';
import { useAnimatedMount } from '../hooks/useAnimatedMount';

const DEVICES = [
  {
    number: 1,
    icon: MicIcon,
    title: 'Primary Microphone',
    tag: 'Input',
    accent: 'bg-blue-600',
    description:
      'Your physical or default microphone — the one you normally speak into. This is the microphone whose audio you share with another person.',
    flow: 'Your microphone → Mic Share → Friend',
  },
  {
    number: 2,
    icon: VirtualMicIcon,
    title: 'Mic Share Virtual Microphone',
    tag: 'Virtual',
    accent: 'bg-green-600',
    description:
      'A virtual microphone (VB-CABLE) that routes audio between apps. A friend\u2019s Mic Share audio is ultimately received through their corresponding VB-CABLE input, where other apps can pick it up as a microphone.',
    flow: 'Friend → Mic Share → Mic Share virtual microphone',
  },
  {
    number: 3,
    icon: HeadphoneIcon,
    title: 'Playback',
    tag: 'Speakers / Headphones',
    accent: 'bg-purple-600',
    description:
      'Your physical speakers or headphones. This is where the audio received from the other user is played back, so you can hear them.',
    flow: 'Friend → Mic Share → Your speakers',
  },
];

export default function DeviceInfoModal({ open, onClose }) {
  const { render, visible } = useAnimatedMount(open);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!render) return null;

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-lg bg-gray-900 border border-gray-800 rounded-lg shadow-2xl max-h-[85vh] overflow-y-auto transition-all duration-200 ${
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 sticky top-0 bg-gray-900">
          <h2 className="text-base font-bold text-gray-100">How Mic Share audio works</h2>
          <button
            onClick={onClose}
            className="rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-100 w-8 h-8 flex items-center justify-center text-lg leading-none"
            title="Close"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm text-gray-400 leading-relaxed">
            Mic Share uses three devices. Each one has a clear role in the
            audio path so you can always tell what is capturing your voice,
            what is routing it, and what lets you hear the other person.
          </p>

          {DEVICES.map((device) => (
            <section
              key={device.number}
              className="rounded-lg bg-gray-950 border border-gray-800 p-4"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`w-9 h-9 rounded-lg ${device.accent} flex items-center justify-center text-white shrink-0`}
                >
                  <device.icon />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-100">
                      {device.number}. {device.title}
                    </h3>
                    <span className="rounded bg-gray-800 border border-gray-700 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                      {device.tag}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed mt-1.5">
                    {device.description}
                  </p>
                  <p className="text-xs font-mono text-gray-300 bg-gray-800 rounded px-2 py-1.5 mt-3">
                    {device.flow}
                  </p>
                </div>
              </div>
            </section>
          ))}

          <p className="text-xs text-gray-500 leading-relaxed">
            In one sentence: your voice is captured by the Primary
            Microphone, shared over the internet, played on the friend&apos;s
            speakers, and routed through their Mic Share virtual microphone
            so other apps can use it as a mic.
          </p>
        </div>
      </div>
    </div>
  );
}
