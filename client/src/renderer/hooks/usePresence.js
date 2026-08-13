import { useCallback, useEffect, useState } from 'react';
import { createApiClient, extractApiError, handleUnauthorized } from '../lib/api';
import socketEvents from '@micshare/shared/src/socket-events.json';

const SOCKET_AUTH_ERROR_HINTS = [
  'authentication required',
  'session expired',
  'invalid authentication token',
  'has been logged out',
  'user no longer exists',
];

export function usePresence(token, socket, initialFriends) {
  const [friends, setFriends] = useState(initialFriends || null);
  const [socketState, setSocketState] = useState('connecting');
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const api = createApiClient(token);
      const { data } = await api.get('/presence/friends');
      setFriends(data.friends);
      setError(null);
    } catch (err) {
      setError(extractApiError(err));
    }
  }, [token]);

  useEffect(() => {
    if (!token || !socket) return undefined;
    let mounted = true;

    const api = createApiClient(token);
    if (!initialFriends) {
      (async () => {
        try {
          const { data } = await api.get('/presence/friends');
          if (!mounted) return;
          setFriends(data.friends);
        } catch (err) {
          if (mounted) setError(extractApiError(err));
        }
      })();
    }

    const onConnect = () => {
      if (mounted) {
        setSocketState('connected');
        refresh();
      }
    };
    const onDisconnect = () => {
      if (mounted) setSocketState('disconnected');
    };
    const onConnectError = (err) => {
      if (mounted) {
        setSocketState('disconnected');
        setError(err.message || 'Socket connection failed');
        const msg = (err.message || '').toLowerCase();
        if (SOCKET_AUTH_ERROR_HINTS.some((hint) => msg.includes(hint))) {
          handleUnauthorized();
        }
      }
    };
    const onPresence = (payload) => {
      if (!mounted) return;
      const { user, online, at } = payload;
      setFriends((prev) => {
        if (!prev) return prev;
        return prev.map((f) =>
          f.id === user.id ? { ...f, online, lastSeenAt: at } : f
        );
      });
    };
    const onFriendsUpdated = () => {
      if (!mounted) return;
      refresh();
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on(socketEvents.presence.update, onPresence);
    socket.on(socketEvents.friends.updated, onFriendsUpdated);

    return () => {
      mounted = false;
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off(socketEvents.presence.update, onPresence);
      socket.off(socketEvents.friends.updated, onFriendsUpdated);
    };
  }, [token, socket, refresh, initialFriends]);

  return {
    friends,
    socketState,
    error,
    refresh,
    isOnline: (userId) => {
      const friend = friends && friends.find((f) => f.id === userId);
      return Boolean(friend && friend.online);
    },
  };
}
