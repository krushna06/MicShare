import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createApiClient, extractApiError } from '../lib/api';
import socketEvents from '@micshare/shared/src/socket-events.json';

const STATUS_LABELS = {
  calling: 'Calling',
  ringing: 'Incoming',
  connecting: 'Connecting',
  connected: 'Sharing',
};

function PresenceDot({ online }) {
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${
        online ? 'bg-green-400' : 'bg-gray-600'
      }`}
      aria-label={online ? 'Online' : 'Offline'}
    />
  );
}

export default function FriendsPanel({
  token,
  friends,
  isOnline,
  onFriendsChange,
  socket,
  sessions,
  startCall,
  hangup,
}) {
  const api = useMemo(() => createApiClient(token), [token]);
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [requestsError, setRequestsError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [busyUserId, setBusyUserId] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);

  const loadRequests = useCallback(async () => {
    try {
      const { data } = await api.get('/friends/requests');
      setIncoming(data.incoming);
      setOutgoing(data.outgoing);
      setRequestsError(null);
    } catch (err) {
      setRequestsError(extractApiError(err));
    }
  }, [api]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (!socket) return undefined;
    socket.on(socketEvents.friends.updated, loadRequests);
    return () => {
      socket.off(socketEvents.friends.updated, loadRequests);
    };
  }, [socket, loadRequests]);

  const runAction = useCallback(async (userId, fn) => {
    setBusyUserId(userId);
    setActionError(null);
    try {
      await fn();
      return true;
    } catch (err) {
      setActionError(extractApiError(err));
      return false;
    } finally {
      setBusyUserId(null);
    }
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSearchError(null);
    try {
      const { data } = await api.get('/users/search', { params: { q } });
      setResults(data.users);
    } catch (err) {
      setSearchError(extractApiError(err));
      setResults(null);
    } finally {
      setSearching(false);
    }
  };

  const sendRequest = (user) =>
    runAction(user.id, async () => {
      await api.post('/friends/request', { userId: user.id });
      await loadRequests();
    });

  const acceptRequest = (request) =>
    runAction(request.sender.id, async () => {
      await api.post('/friends/accept', { requestId: request.requestId });
      await loadRequests();
      await onFriendsChange();
    });

  const rejectRequest = (request) =>
    runAction(request.sender.id, async () => {
      await api.post('/friends/reject', { requestId: request.requestId });
      await loadRequests();
    });

  const unfriend = (friend) =>
    runAction(friend.id, async () => {
      await api.delete(`/friends/${friend.id}`);
      await loadRequests();
      await onFriendsChange();
    });

  const statusFor = (userId) => {
    if (friends && friends.some((f) => f.id === userId)) return 'friends';
    if (incoming.some((r) => r.sender.id === userId)) return 'incoming';
    if (outgoing.some((r) => r.receiver.id === userId)) return 'outgoing';
    return 'none';
  };

  const onlineCount = friends ? friends.filter((f) => f.online).length : 0;

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending', badge: incoming.length },
    { id: 'add', label: 'Add' },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-4 pt-4 pb-2 border-b border-gray-800 shrink-0">
        <h2 className="text-sm font-semibold text-gray-100 uppercase tracking-wide">Friends</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          {onlineCount} online · {friends ? friends.length : 0} total
        </p>
      </div>

      <div className="flex gap-1 px-3 py-2 border-b border-gray-800 shrink-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-gray-800 text-gray-100'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            }`}
          >
            {t.label}
            {t.badge > 0 && (
              <span className="rounded-full bg-blue-600 text-white text-[10px] font-semibold px-1.5 py-0.5 leading-none">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1">
        {actionError && (
          <p className="text-xs text-red-400 bg-red-900/30 rounded px-2 py-1.5 mb-2 whitespace-pre-line">
            {actionError}
          </p>
        )}
        {requestsError && tab === 'pending' && (
          <p className="text-xs text-red-400 bg-red-900/30 rounded px-2 py-1.5 mb-2 whitespace-pre-line">
            {requestsError}
          </p>
        )}

        {tab === 'all' && (
          <FriendsList
            friends={friends}
            busyUserId={busyUserId}
            sessions={sessions}
            startCall={startCall}
            hangup={hangup}
            unfriend={unfriend}
          />
        )}

        {tab === 'pending' && (
          <div className="space-y-2">
            {incoming.map((request) => (
              <div key={request.requestId} className="rounded-md bg-gray-800/60 border border-gray-700 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <PresenceDot online={isOnline(request.sender.id)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{request.sender.displayName}</p>
                    <p className="text-xs text-gray-500 truncate">@{request.sender.username}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => acceptRequest(request)}
                    disabled={busyUserId === request.sender.id}
                    className="flex-1 rounded bg-green-600 hover:bg-green-500 disabled:opacity-50 px-2 py-1.5 text-sm text-white"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => rejectRequest(request)}
                    disabled={busyUserId === request.sender.id}
                    className="flex-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 px-2 py-1.5 text-sm"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
            {outgoing.map((request) => (
              <div key={request.requestId} className="rounded-md bg-gray-800/60 border border-gray-700 p-3 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{request.receiver.displayName}</p>
                  <p className="text-xs text-gray-500 truncate">@{request.receiver.username}</p>
                </div>
                <span className="text-xs text-gray-400">Request sent</span>
              </div>
            ))}
            {incoming.length === 0 && outgoing.length === 0 && (
              <p className="text-sm text-gray-400">No pending requests.</p>
            )}
          </div>
        )}

        {tab === 'add' && (
          <div>
            <form onSubmit={handleSearch} className="flex gap-2 mb-3">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search users…"
                className="flex-1 min-w-0 rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={searching || !query.trim()}
                className="rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 px-3 py-2 text-sm"
              >
                {searching ? '…' : 'Search'}
              </button>
            </form>
            {searchError && (
              <p className="text-xs text-red-400 bg-red-900/30 rounded px-2 py-1.5 mb-2 whitespace-pre-line">
                {searchError}
              </p>
            )}
            {results !== null && (
              <ul className="space-y-1">
                {results.length === 0 ? (
                  <li className="text-sm text-gray-400">No users found.</li>
                ) : (
                  results.map((user) => {
                    const status = statusFor(user.id);
                    return (
                      <li key={user.id} className="rounded-md px-2 py-2 flex items-center gap-2 bg-gray-800/40">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{user.displayName}</p>
                          <p className="text-xs text-gray-500 truncate">@{user.username}</p>
                        </div>
                        {status === 'friends' ? (
                          <span className="text-xs text-gray-400">Friends</span>
                        ) : status === 'incoming' ? (
                          <span className="text-xs text-gray-400">Received</span>
                        ) : status === 'outgoing' ? (
                          <span className="text-xs text-gray-400">Sent</span>
                        ) : (
                          <button
                            onClick={() => sendRequest(user)}
                            disabled={busyUserId === user.id}
                            className="rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-3 py-1.5 text-sm text-white"
                          >
                            {busyUserId === user.id ? '…' : 'Add'}
                          </button>
                        )}
                      </li>
                    );
                  })
                )}
              </ul>
            )}
          </div>
        )}
      </div>

      {confirmRemove && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
          onClick={() => setConfirmRemove(null)}
        >
          <div
            className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-lg shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-gray-100 mb-2">Remove friend?</h3>
            <p className="text-sm text-gray-400 mb-6">
              Remove{' '}
              <span className="text-white font-medium">{confirmRemove.displayName}</span> (
              @{confirmRemove.username}) from your friends?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmRemove(null)}
                className="rounded bg-gray-800 hover:bg-gray-700 px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  unfriend(confirmRemove);
                  setConfirmRemove(null);
                }}
                className="rounded bg-red-600 hover:bg-red-500 px-3 py-1.5 text-sm font-medium text-white"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FriendsList({ friends, busyUserId, sessions, startCall, hangup, unfriend }) {
  if (friends === null) {
    return <p className="text-sm text-gray-400 px-2">Loading friends…</p>;
  }
  if (friends.length === 0) {
    return <p className="text-sm text-gray-400 px-2">No friends yet. Use the Add tab to find people.</p>;
  }
  const ordered = [...friends].sort((a, b) => Number(b.online) - Number(a.online));
  return (
    <ul className="space-y-1">
      {ordered.map((friend) => {
        const session = sessions[friend.id];
        const statusLabel = session ? STATUS_LABELS[session.status] : null;
        const inCall = session && session.status !== 'ended';
        return (
          <li
            key={friend.id}
            className="group rounded-md px-2 py-2 flex items-center gap-2.5 hover:bg-gray-800/50"
          >
            <PresenceDot online={friend.online} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-100 truncate">{friend.displayName}</p>
              <p className="text-xs text-gray-500 truncate">
                {friend.online
                  ? statusLabel
                    ? <span className="text-green-400">{statusLabel}</span>
                    : 'Online'
                  : 'Offline'}
              </p>
            </div>
            <button
              onClick={() => setConfirmRemove(friend)}
              disabled={busyUserId === friend.id}
              title="Remove friend"
              className="hidden group-hover:flex shrink-0 rounded bg-gray-800 hover:bg-red-900/60 disabled:opacity-50 px-2 py-1 text-xs text-gray-400 hover:text-red-300"
            >
              {busyUserId === friend.id ? '…' : 'Remove'}
            </button>
            {inCall && session.status === 'connected' ? (
              <button
                onClick={() => hangup(friend.id)}
                className="shrink-0 rounded bg-red-600 hover:bg-red-500 px-2.5 py-1.5 text-xs text-white"
              >
                Stop
              </button>
            ) : inCall ? (
              <button
                onClick={() => hangup(friend.id)}
                className="shrink-0 rounded bg-gray-800 hover:bg-gray-700 px-2.5 py-1.5 text-xs"
              >
                Cancel
              </button>
            ) : friend.online ? (
              <button
                onClick={() => startCall(friend)}
                className="shrink-0 rounded bg-blue-600 hover:bg-blue-500 px-2.5 py-1.5 text-xs text-white font-medium"
              >
                Share mic
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
