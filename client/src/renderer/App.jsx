import React, { useCallback, useEffect, useState } from 'react';
import { initApi, createApiClient, extractApiError, setUnauthorizedHandler } from './lib/api';
import AuthScreen from './components/AuthScreen';
import HomeScreen from './components/HomeScreen';

export default function App() {
  const [phase, setPhase] = useState('booting');
  const [auth, setAuth] = useState(null);
  const [bootingError, setBootingError] = useState(null);

  useEffect(() => {
    setUnauthorizedHandler(async () => {
      await window.micShare?.auth?.delete();
      setAuth(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    (async () => {
      await initApi();

      try {
        const token = await window.micShare?.auth?.get();
        if (token) {
          const api = createApiClient(token);
          const { data } = await api.get('/users/me');
          setAuth({ token, user: data.user });
        }
      } catch {
        await window.micShare?.auth?.delete();
      } finally {
        setPhase('ready');
      }
    })();
  }, []);

  const handleAuthenticated = useCallback(async (token, user) => {
    await window.micShare?.auth?.set(token);
    setAuth({ token, user });
  }, []);

  const handleLogout = useCallback(async () => {
    const current = auth;
    setAuth(null);
    try {
      await window.micShare?.auth?.delete();
      if (current) {
        const api = createApiClient(current.token);
        await api.post('/auth/logout');
      }
    } catch (err) {
      setBootingError(extractApiError(err));
    }
  }, [auth]);

  if (phase === 'booting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-100">
        <p className="text-gray-400">Loading Mic Share…</p>
      </div>
    );
  }

  if (bootingError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-gray-100 gap-4 p-8">
        <p className="text-red-400">{bootingError}</p>
        <button
          onClick={() => setBootingError(null)}
          className="px-4 py-2 rounded bg-gray-800 hover:bg-gray-700"
        >
          Dismiss
        </button>
      </div>
    );
  }

  if (auth) {
    return <HomeScreen token={auth.token} user={auth.user} onLogout={handleLogout} />;
  }

  return <AuthScreen onAuthenticated={handleAuthenticated} />;
}
