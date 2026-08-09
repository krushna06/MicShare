import React, { useState } from 'react';
import { createApiClient, extractApiError, postWithRetry } from '../lib/api';
import Logo from './Logo';

export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login'); // login | register
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const api = createApiClient(null);
      const path = mode === 'login' ? '/auth/login' : '/auth/register';
      const body = mode === 'login' ? { username, password } : { username, password, displayName: displayName || undefined };
      const { data } = mode === 'login'
        ? await postWithRetry(api, path, body)
        : await api.post(path, body);
      await onAuthenticated(data.token, data.user);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  function switchMode(next) {
    setMode(next);
    setError(null);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-lg shadow-2xl p-8">
        <div className="flex items-center gap-3 mb-5">
          <Logo className="w-12 h-12" />
          <div>
            <h1 className="text-2xl font-bold text-gray-100 leading-tight">Mic Share</h1>
            <p className="text-sm text-gray-400">Share your microphone with friends in real time.</p>
          </div>
        </div>

        <div className="flex rounded-lg bg-gray-800 p-1 mb-6">
          <button
            onClick={() => switchMode('login')}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === 'login' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => switchMode('register')}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === 'register' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-900/30 rounded px-3 py-2 whitespace-pre-line">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-2 text-sm font-semibold text-white"
          >
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
}
