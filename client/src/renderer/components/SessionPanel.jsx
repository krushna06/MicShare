import React, { useEffect, useRef } from 'react';

function PresenceDot({ online }) {
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full ${
        online ? 'bg-green-400' : 'bg-gray-600'
      }`}
      aria-label={online ? 'Online' : 'Offline'}
    />
  );
}

function AudioSink({ stream, playbackId, routeId, deafened }) {
  const playbackRef = useRef(null);
  const routeRef = useRef(null);

  useEffect(() => {
    const els = [playbackRef.current, routeRef.current].filter(Boolean);
    els.forEach((el) => {
      el.srcObject = stream;
      el.play().catch(() => {});
    });
    return () => {
      els.forEach((el) => {
        el.srcObject = null;
      });
    };
  }, [stream]);

  useEffect(() => {
    const el = playbackRef.current;
    if (el && playbackId && typeof el.setSinkId === 'function') {
      el.setSinkId(playbackId).catch(() => {});
    }
  }, [playbackId, stream]);

  useEffect(() => {
    const el = routeRef.current;
    if (el && routeId && typeof el.setSinkId === 'function') {
      el.setSinkId(routeId).catch(() => {});
    }
  }, [routeId, stream]);

  useEffect(() => {
    [playbackRef.current, routeRef.current]
      .filter(Boolean)
      .forEach((el) => {
        el.muted = Boolean(deafened);
      });
  }, [deafened, stream]);

  return (
    <>
      <audio ref={playbackRef} className="hidden" />
      {routeId && <audio ref={routeRef} className="hidden" />}
    </>
  );
}

const STATUS_META = {
  calling: { label: 'Calling…', dot: 'bg-amber-400' },
  ringing: { label: 'Incoming…', dot: 'bg-amber-400' },
  connecting: { label: 'Connecting…', dot: 'bg-amber-400' },
  connected: { label: 'Sharing mic', dot: 'bg-green-400' },
  ended: { label: 'Ended', dot: 'bg-gray-600' },
};

export default function SessionPanel({
  incoming,
  sessions,
  acceptCall,
  declineCall,
  hangup,
  playbackId,
  routeId,
  deafened,
}) {
  const liveSessions = Object.values(sessions).filter((s) => s.status !== 'ended');
  const liveCount = liveSessions.filter((s) => s.status === 'connected').length;

  // Ringing/connecting sessions first, connected ones next, by recency.
  const ordered = [...liveSessions].sort((a, b) => {
    const rank = { ringing: 0, calling: 1, connecting: 2, connected: 3 };
    return rank[a.status] - rank[b.status];
  });

  return (
    <section className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
            Call &amp; session
          </h2>
          {liveCount > 0 && (
            <p className="text-xs text-green-400 mt-1">
              Sharing your mic with {liveCount} {liveCount === 1 ? 'friend' : 'friends'}
            </p>
          )}
        </div>
      </div>

      {incoming && (
        <div className="mb-4 rounded-lg bg-blue-950/40 border border-blue-800/60 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <PresenceDot online />
            <p className="text-sm text-gray-100 truncate">
              Incoming call from{' '}
              <span className="font-semibold text-white">{incoming.friend.displayName}</span>
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => acceptCall(incoming.friend)}
              className="rounded bg-green-600 hover:bg-green-500 px-3 py-1.5 text-sm text-white font-medium"
            >
              Accept
            </button>
            <button
              onClick={() => declineCall(incoming.friend.id)}
              className="rounded bg-gray-800 hover:bg-gray-700 px-3 py-1.5 text-sm"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {ordered.length === 0 ? (
        <p className="text-sm text-gray-400">
          No active sessions. Pick a friend on the left and press{' '}
          <span className="text-gray-200 font-medium">Share mic</span> to start sharing.
        </p>
      ) : (
        <ul className="space-y-3">
          {ordered.map((session) => {
            const meta = STATUS_META[session.status] || STATUS_META.ended;
            return (
              <li
                key={session.friend.id}
                className="rounded-lg bg-gray-800/60 border border-gray-700 p-4"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate font-medium">
                      {session.friend.displayName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {session.status === 'connected'
                        ? 'Receiving remote audio via WebRTC'
                        : meta.label}
                    </p>
                  </div>
                  <span className="text-xs text-gray-300 font-medium uppercase tracking-wide">
                    {meta.label}
                  </span>
                  <button
                    onClick={() => hangup(session.friend.id)}
                    className="rounded bg-red-600 hover:bg-red-500 px-3 py-1.5 text-sm text-white"
                  >
                    {session.status === 'connected' ? 'Stop sharing' : 'Cancel'}
                  </button>
                </div>
                {session.error && (
                  <p className="text-xs text-red-400 bg-red-900/30 rounded px-2 py-1 mt-3 whitespace-pre-line">
                    {session.error}
                  </p>
                )}
                {session.remoteStream && session.status === 'connected' && (
                  <AudioSink
                    stream={session.remoteStream}
                    playbackId={playbackId}
                    routeId={routeId}
                    deafened={deafened}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
