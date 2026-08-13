import React, { useCallback, useEffect, useState } from 'react';
import { initApi, createApiClient, extractApiError, setUnauthorizedHandler } from './lib/api';
import AuthScreen from './components/AuthScreen';
import HomeScreen from './components/HomeScreen';
import Logo from './components/Logo';

export default function App() {
  const [phase, setPhase] = useState('booting');
  const [auth, setAuth] = useState(null);
  const [bootingError, setBootingError] = useState(null);

  const loadInitialData = useCallback(async (token) => {
    const api = createApiClient(token);
    let friends = null;
    let requests = null;
    try {
      const [presenceRes, requestsRes] = await Promise.all([
        api.get('/presence/friends'),
        api.get('/friends/requests'),
      ]);
      friends = presenceRes.data.friends;
      requests = requestsRes.data;
    } catch {
    }
    return { friends, requests };
  }, []);

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
          const initial = await loadInitialData(token);
          setAuth({ token, user: data.user, ...initial });
        }
      } catch {
        await window.micShare?.auth?.delete();
      } finally {
        setPhase('ready');
      }
    })();
  }, [loadInitialData]);

  const handleAuthenticated = useCallback(
    async (token, user) => {
      await window.micShare?.auth?.set(token);
      const initial = await loadInitialData(token);
      setAuth({ token, user, ...initial });
    },
    [loadInitialData]
  );

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-gray-100 gap-6 select-none">
        <Logo className="w-20 h-20 animate-pulse" />
        <div className="flex items-center gap-1 text-2xl font-bold tracking-wide text-gray-400">
          Loading Mic Share
          <span className="boot-dot">.</span>
          <span className="boot-dot">.</span>
          <span className="boot-dot">.</span>
        </div>
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
    return (
      <HomeScreen
        token={auth.token}
        user={auth.user}
        onLogout={handleLogout}
        initialFriends={auth.friends}
        initialRequests={auth.requests}
      />
    );
  }

  return <AuthScreen onAuthenticated={handleAuthenticated} />;
}
