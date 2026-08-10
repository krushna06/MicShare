import React, { useEffect, useState } from 'react';
import { extractApiError } from '../lib/api';
import { useAnimatedMount } from '../hooks/useAnimatedMount';
import DevicesPanel from './DevicesPanel';
import SettingsPanel from './SettingsPanel';

export default function SettingsModal({
  open,
  devices,
  turn,
  turnCustom,
  turnLoaded,
  onSaveTurn,
  onUpdateProfile,
  profile,
  onClose,
}) {
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [savedAt, setSavedAt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const next = displayName.trim();
    if (!next) {
      setError('Display name cannot be empty');
      return;
    }
    if (next.length > 64) {
      setError('Display name must be at most 64 characters');
      return;
    }
    if (next === profile?.displayName) {
      setSavedAt(new Date());
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onUpdateProfile(next);
      setSavedAt(new Date());
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString()
    : '—';

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
        className={`w-full max-w-xl bg-gray-900 border border-gray-800 rounded-lg shadow-2xl max-h-[85vh] overflow-y-auto transition-all duration-200 ${
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 sticky top-0 bg-gray-900 z-40">
          <h2 className="text-base font-bold text-gray-100">Settings</h2>
          <button
            onClick={onClose}
            className="rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-100 w-8 h-8 flex items-center justify-center text-lg leading-none"
            title="Close settings"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          <section className="bg-gray-950 border border-gray-800 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
              Profile
            </h3>
            <dl className="grid grid-cols-2 gap-4 text-sm mb-5">
              <div>
                <dt className="text-gray-500">Username</dt>
                <dd className="text-white">{profile?.username || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Member since</dt>
                <dd className="text-white">{memberSince}</dd>
              </div>
            </dl>
            <form onSubmit={handleSaveProfile}>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Display name
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                  className="flex-1 min-w-0 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white shrink-0"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
              <div className="flex items-center gap-3 mt-2">
                {error && (
                  <p className="text-xs text-red-400 whitespace-pre-line">{error}</p>
                )}
                {!error && savedAt && (
                  <p className="text-xs text-green-400">
                    Saved {savedAt.toLocaleTimeString()}
                  </p>
                )}
              </div>
            </form>
          </section>

          <DevicesPanel {...devices} />
          <SettingsPanel turn={turn} custom={turnCustom} loaded={turnLoaded} onSave={onSaveTurn} />
        </div>
      </div>
    </div>
  );
}
