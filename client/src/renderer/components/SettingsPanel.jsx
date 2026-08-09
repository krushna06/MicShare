import React, { useEffect, useState } from 'react';
import { DEFAULT_TURN } from '../hooks/useRtcConfig';

function Toggle({ checked, onChange, label, description }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="flex items-center gap-3 w-full text-left group"
    >
      <span
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
          checked ? 'bg-blue-600' : 'bg-gray-700'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-sm text-gray-200 group-hover:text-gray-100">{label}</span>
        {description && <span className="block text-xs text-gray-500">{description}</span>}
      </span>
    </button>
  );
}

export default function SettingsPanel({ turn, custom, loaded, onSave }) {
  const [useCustom, setUseCustom] = useState(false);
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!loaded) return;
    setUseCustom(Boolean(custom));
    setUrl(turn ? turn.url : '');
    setUsername(turn ? turn.username : '');
    setPassword(turn ? turn.credential : '');
  }, [loaded, turn, custom]);

  const validUrl = url.trim().match(/^turn(s)?:/i);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (useCustom && url.trim() && !validUrl) {
      setError('TURN URL must start with "turn:" or "turns:" (e.g. turn:relay.example.com:3478)');
      return;
    }
    setError(null);
    await onSave({ custom: useCustom, url: url.trim(), username: username.trim(), password });
    setSavedAt(new Date());
  };

  return (
    <section className="bg-gray-950 border border-gray-800 rounded-lg p-5">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
        TURN relay
      </h3>

      {!loaded ? (
        <p className="text-sm text-gray-400">Loading settings…</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Toggle
            checked={useCustom}
            onChange={() => {
              setUseCustom((v) => !v);
              setSavedAt(null);
            }}
            label="Use my own TURN server"
            description="Your credentials are never sent to the Mic Share server."
          />

          {!useCustom ? (
            <div className="rounded-lg bg-gray-800/60 border border-gray-700 px-3 py-2.5">
              <p className="text-sm text-gray-300">Using the built-in Mic Share relay server.</p>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{DEFAULT_TURN.url}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">TURN server URL</label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="turn:relay.example.com:3478"
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Password / credential</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400 bg-red-900/30 rounded px-3 py-2">{error}</p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-medium text-white"
            >
              Save
            </button>
            {savedAt && (
              <span className="text-xs text-green-400">Saved {savedAt.toLocaleTimeString()}</span>
            )}
            <span className="text-xs text-gray-400 ml-auto">
              {useCustom && url.trim() ? 'Custom relay' : 'Built-in relay'}
            </span>
          </div>
        </form>
      )}
    </section>
  );
}
