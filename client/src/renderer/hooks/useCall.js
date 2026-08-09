import { useCallback, useEffect, useRef, useState } from 'react';
import socketEvents from '@micshare/shared/src/socket-events.json';

const CALL_TIMEOUT_MS = 30000;

export function useCall({ socket, mic, iceServers, friends }) {
  const [sessions, setSessions] = useState({});
  const [incoming, setIncoming] = useState(null);
  const pcsRef = useRef({});
  const pendingOffersRef = useRef({});
  const timeoutsRef = useRef({});
  const sessionsRef = useRef({});

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  const updateSession = useCallback((friendId, patch) => {
    setSessions((prev) => {
      const current = prev[friendId];
      if (!current) return prev;
      return { ...prev, [friendId]: { ...current, ...patch } };
    });
  }, []);

  const clearTimeoutFor = useCallback((friendId) => {
    const timer = timeoutsRef.current[friendId];
    if (timer) {
      clearTimeout(timer);
      delete timeoutsRef.current[friendId];
    }
  }, []);

  const closePeer = useCallback((friendId) => {
    const pc = pcsRef.current[friendId];
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.close();
    }
    delete pcsRef.current[friendId];
  }, []);

  const ensureStream = useCallback(async () => {
    if (mic.stream) return mic.stream;
    return mic.start();
  }, [mic]);

  const createPeer = useCallback(
    (friendId) => {
      const pc = new RTCPeerConnection({ iceServers });
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit(socketEvents.rtc.ice, {
            to: friendId,
            candidate: event.candidate.toJSON(),
          });
        }
      };
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === 'connected') {
          clearTimeoutFor(friendId);
          updateSession(friendId, { status: 'connected' });
        } else if (state === 'failed') {
          updateSession(friendId, { status: 'ended', error: `Connection ${state}` });
          closePeer(friendId);
        }
      };
      pc.ontrack = (event) => {
        updateSession(friendId, { remoteStream: event.streams[0] || null });
      };
      pcsRef.current[friendId] = pc;
      return pc;
    },
    [socket, updateSession, closePeer, clearTimeoutFor, iceServers]
  );

  const addLocalTracks = useCallback(
    async (pc) => {
      const stream = await ensureStream();
      const tracks = stream.getAudioTracks();
      if (tracks.length === 0) throw new Error('No microphone track to share');
      tracks.forEach((track) => pc.addTrack(track, stream));
    },
    [ensureStream]
  );

  const endSession = useCallback(
    (friendId, reason) => {
      clearTimeoutFor(friendId);
      closePeer(friendId);
      delete pendingOffersRef.current[friendId];
      updateSession(friendId, { status: 'ended', error: reason || null, remoteStream: null });
    },
    [clearTimeoutFor, closePeer, updateSession]
  );

  const startCall = useCallback(
    async (friend) => {
      try {
        if (pcsRef.current[friend.id]) return;
        const pc = createPeer(friend.id);
        await addLocalTracks(pc);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        setSessions((prev) => ({ ...prev, [friend.id]: { friend, status: 'calling' } }));
        socket.emit(socketEvents.rtc.call, { to: friend.id, offer: pc.localDescription });
        timeoutsRef.current[friend.id] = setTimeout(() => {
          socket.emit(socketEvents.rtc.hangup, { to: friend.id });
          endSession(friend.id, 'No answer');
        }, CALL_TIMEOUT_MS);
      } catch (err) {
        closePeer(friend.id);
        setSessions((prev) => ({
          ...prev,
          [friend.id]: { friend, status: 'ended', error: err.message },
        }));
      }
    },
    [socket, createPeer, addLocalTracks, closePeer, endSession]
  );

  const acceptCall = useCallback(
    async (friend) => {
      const offer = pendingOffersRef.current[friend.id];
      if (!offer) return;
      delete pendingOffersRef.current[friend.id];
      clearTimeoutFor(friend.id);
      setIncoming(null);
      try {
        const pc = createPeer(friend.id);
        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        setSessions((prev) => ({ ...prev, [friend.id]: { friend, status: 'connecting' } }));
        socket.emit(socketEvents.rtc.answer, { to: friend.id, answer: pc.localDescription });
      } catch (err) {
        closePeer(friend.id);
        setSessions((prev) => ({
          ...prev,
          [friend.id]: { friend, status: 'ended', error: err.message },
        }));
      }
    },
    [socket, createPeer, closePeer]
  );

  const declineCall = useCallback(
    (friendId) => {
      socket.emit(socketEvents.rtc.hangup, { to: friendId });
      endSession(friendId, null);
      setIncoming((current) => (current && current.friend.id === friendId ? null : current));
    },
    [socket, endSession]
  );

  const hangup = useCallback(
    (friendId) => {
      socket.emit(socketEvents.rtc.hangup, { to: friendId });
      endSession(friendId, null);
    },
    [socket, endSession]
  );

  useEffect(() => {
    if (!socket) return undefined;

    const onCall = (payload) => {
      const { from, fromUser, offer } = payload;
      if (pcsRef.current[from] || !offer) return;
      const friend = {
        id: from,
        username: fromUser ? fromUser.username : String(from),
        displayName: fromUser ? fromUser.displayName : `User ${from}`,
      };
      pendingOffersRef.current[from] = offer;
      setSessions((prev) => ({ ...prev, [from]: { friend, status: 'ringing' } }));
      setIncoming({ friend });
      timeoutsRef.current[from] = setTimeout(() => {
        socket.emit(socketEvents.rtc.hangup, { to: from });
        endSession(from, 'No answer');
        setIncoming((current) => (current && current.friend.id === from ? null : current));
      }, CALL_TIMEOUT_MS);
    };

    const onAnswer = async (payload) => {
      const { from, answer } = payload;
      const pc = pcsRef.current[from];
      if (!pc || !answer || pc.signalingState !== 'have-local-offer') return;
      clearTimeoutFor(from);
      try {
        await pc.setRemoteDescription(answer);
        updateSession(from, { status: 'connecting' });
      } catch (err) {
        endSession(from, err.message);
      }
    };

    const onIce = async (payload) => {
      const { from, candidate } = payload;
      const pc = pcsRef.current[from];
      if (!pc || !candidate) return;
      try {
        await pc.addIceCandidate(candidate);
      } catch {
      }
    };

    const onHangup = (payload) => {
      const { from } = payload;
      endSession(from, null);
      setIncoming((current) => (current && current.friend.id === from ? null : current));
    };

    socket.on(socketEvents.rtc.call, onCall);
    socket.on(socketEvents.rtc.answer, onAnswer);
    socket.on(socketEvents.rtc.ice, onIce);
    socket.on(socketEvents.rtc.hangup, onHangup);
    return () => {
      socket.off(socketEvents.rtc.call, onCall);
      socket.off(socketEvents.rtc.answer, onAnswer);
      socket.off(socketEvents.rtc.ice, onIce);
      socket.off(socketEvents.rtc.hangup, onHangup);
    };
  }, [socket, closePeer, clearTimeoutFor, endSession, updateSession]);

  useEffect(() => {
    if (!friends) return undefined;
    Object.keys(sessionsRef.current).forEach((friendId) => {
      const session = sessionsRef.current[friendId];
      if (!session || session.status === 'ended') return;
      const friend = friends.find((f) => f.id === Number(friendId));
      if (!friend || friend.online === false) {
        endSession(friendId, 'User went offline');
        setIncoming((current) => (current && current.friend.id === Number(friendId) ? null : current));
      }
    });
    return undefined;
  }, [friends, endSession]);

  useEffect(() => {
    if (!socket) return undefined;
    const onDisconnect = () => endActive('Connection lost');
    const onConnectError = () => endActive('Connection lost');
    const endActive = (reason) => {
      Object.keys(sessionsRef.current).forEach((friendId) => {
        const session = sessionsRef.current[friendId];
        if (session && session.status !== 'ended') {
          endSession(friendId, reason);
        }
      });
      setIncoming(null);
    };
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    return () => {
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
    };
  }, [socket, endSession]);

  useEffect(() => {
    if (!mic.capturing) return undefined;
    const hasActive = Object.values(sessions).some((s) => s.status !== 'ended');
    if (!hasActive) {
      mic.stop();
    }
    return undefined;
  }, [sessions, mic.capturing, mic.stop]);

  useEffect(() => {
    if (!mic.stream) return undefined;
    const newTrack = mic.stream.getAudioTracks()[0];
    if (!newTrack) return undefined;
    Object.values(pcsRef.current).forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'audio');
      if (sender && sender.track !== newTrack) {
        sender.replaceTrack(newTrack).catch(() => {});
      }
    });
    return undefined;
  }, [mic.stream]);

  useEffect(
    () => () => {
      Object.keys(pcsRef.current).forEach((friendId) => closePeer(friendId));
      Object.keys(timeoutsRef.current).forEach((friendId) => clearTimeoutFor(friendId));
    },
    [closePeer, clearTimeoutFor]
  );

  return { sessions, incoming, startCall, acceptCall, declineCall, hangup };
}
