import React, { useEffect, useState } from 'react';
import { extractApiError } from '../lib/api';
import DevicesPanel from './DevicesPanel';
import SettingsPanel from './SettingsPanel';
import SelectMenu from './SelectMenu';
import Modal from './Modal';

export default function SettingsModal({
  devices,
  turn,
  turnCustom,
  turnLoaded,
  onSaveTurn,
  onUpdateProfile,
  profile,
  noiseSuppression,
  onNoiseSuppressionChange,
  open,
  onClose,
}) {
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [savedAt, setSavedAt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [currentVersion, setCurrentVersion] = useState(null);
  const [updateStatus, setUpdateStatus] = useState(null);
  const [checkingUpdates, setCheckingUpdates] = useState(false);

  useEffect(() => {
    let mounted = true;
    window.micShare?.app
      ?.getVersion()
      .then((v) => {
        if (mounted) setCurrentVersion(v);
      })
      .catch(() => {});
    const unsubscribe = window.micShare?.updater?.onStatus?.((payload) => {
      if (!mounted) return;
      setUpdateStatus(payload);
      setCheckingUpdates(payload.status === 'checking' || payload.status === 'downloading');
    });
    return () => {
      mounted = false;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const handleCheckUpdates = async () => {
    setUpdateStatus(null);
    setCheckingUpdates(true);
    try {
      const result = await window.micShare?.updater?.check();
      if (result && result.status === 'disabled') {
        setUpdateStatus({ status: 'disabled' });
        setCheckingUpdates(false);
      }
    } catch {
      setUpdateStatus({ status: 'error', message: 'Could not check for updates' });
      setCheckingUpdates(false);
    }
  };

  const updateMessage = (() => {
    if (!updateStatus) return null;
    switch (updateStatus.status) {
      case 'disabled':
        return 'Updates are not available in this build.';
      case 'checking':
        return 'Checking for updates…';
      case 'available':
        return `Version ${updateStatus.version} is available and downloading.`;
      case 'up-to-date':
        return "You're on the latest version.";
      case 'downloading':
        return `Downloading update… ${updateStatus.percent ?? 0}%`;
      case 'downloaded':
        return `Version ${updateStatus.version} is ready to install. Restart to apply.`;
      case 'error':
        return updateStatus.message || 'Something went wrong checking for updates.';
      default:
        return null;
    }
  })();

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

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-xl">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900 shrink-0">
        <h2 className="text-base font-bold text-gray-100">Settings</h2>
        <button
          onClick={onClose}
          className="rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-100 w-8 h-8 flex items-center justify-center text-lg leading-none"
          title="Close settings"
        >
          ×
        </button>
      </div>

        <div className="p-6 space-y-6 overflow-y-auto min-h-0">
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

          <section className="bg-gray-950 border border-gray-800 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Audio
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              How your microphone is cleaned up before it is shared with friends.
            </p>
            <p className="block text-sm font-medium text-gray-300 mb-1">
              Noise suppression
            </p>
            <SelectMenu
              value={noiseSuppression}
              onChange={onNoiseSuppressionChange}
              placeholder="Noise suppression"
              options={[
                { value: 'off', label: 'Off' },
                { value: 'builtin', label: 'Built-in (Chrome)' },
                { value: 'rnnoise', label: 'RNNoise (recommended)' },
              ]}
            />
            <p className="text-xs text-gray-500 mt-2">
              RNNoise removes background noise using a neural network running locally. Built-in
              uses your browser's native echo/noise cancellation.
            </p>
          </section>

          <section className="bg-gray-950 border border-gray-800 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
              Software updates
            </h3>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm text-gray-300">
                  {currentVersion ? `Mic Share ${currentVersion}` : 'Mic Share'}
                </p>
                {updateMessage && (
                  <p
                    className={`text-xs mt-1 ${
                      updateStatus?.status === 'error' ? 'text-red-400' : 'text-gray-500'
                    }`}
                  >
                    {updateMessage}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleCheckUpdates}
                disabled={checkingUpdates}
                className="rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 px-4 py-2 text-sm font-medium text-gray-200 shrink-0"
              >
                {checkingUpdates ? 'Checking…' : 'Check for updates'}
              </button>
            </div>
          </section>
        </div>
    </Modal>
  );
}
