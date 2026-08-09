import React from 'react';

function LevelMeter({ level }) {
  const pct = Math.round(level * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-gray-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-100 ${
            level > 0.85 ? 'bg-red-400' : level > 0.4 ? 'bg-amber-400' : 'bg-green-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-400 tabular-nums w-10 text-right">{pct}%</span>
    </div>
  );
}

export default function CapturePanel({ selectedInput, inputs, mic }) {
  const { level, format, error } = mic;
  const selectedDevice = inputs.find((d) => d.deviceId === selectedInput) || null;

  return (
    <section className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
          Microphone capture
        </h2>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-red-400 uppercase tracking-wide">
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          Live
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-xs text-gray-500 mb-1">Capturing from</p>
          <p className="text-sm text-white truncate" data-testid="capture-device">
            {selectedDevice ? selectedDevice.label : 'System default microphone'}
          </p>
        </div>

        <div data-testid="level-meter">
          <p className="text-xs text-gray-500 mb-1">Live level</p>
          <LevelMeter level={level} />
        </div>

        {format && (
          <p className="text-xs text-gray-500" data-testid="capture-format">
            {format.label ? `${format.label} · ` : ''}
            {format.sampleRate.toLocaleString()} Hz · {format.channelCount} channel
            {format.channelCount === 1 ? '' : 's'}
          </p>
        )}

        {error && (
          <p
            className="text-sm text-red-400 bg-red-900/30 rounded px-3 py-2 whitespace-pre-line"
            data-testid="capture-error"
          >
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
