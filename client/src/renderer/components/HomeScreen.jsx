import React, { useCallback, useMemo, useState } from 'react';
import { createApiClient } from '../lib/api';
import { useSocket } from '../hooks/useSocket';
import { usePresence } from '../hooks/usePresence';
import { useDevices } from '../hooks/useDevices';
import { useMicrophone } from '../hooks/useMicrophone';
import { useRtcConfig } from '../hooks/useRtcConfig';
import { useCall } from '../hooks/useCall';
import {
  MicIcon,
  MicOffIcon,
  HeadphoneIcon,
  HeadphoneOffIcon,
  GearIcon,
  InfoIcon,
} from './icons';
import FriendsPanel from './FriendsPanel';
import CapturePanel from './CapturePanel';
import SessionPanel from './SessionPanel';
import SettingsModal from './SettingsModal';
import DeviceInfoModal from './DeviceInfoModal';
import SoundboardPanel from './SoundboardPanel';
import Logo from './Logo';

export default function HomeScreen({
  token,
  user,
  onLogout,
  initialFriends,
  initialRequests,
}) {
  const [profile, setProfile] = useState(user);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deviceInfoOpen, setDeviceInfoOpen] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const socket = useSocket(token);
  const { friends, error: presenceError, isOnline, refresh: refreshFriends } = usePresence(
    token,
    socket,
    initialFriends
  );
  const devices = useDevices();
  const mic = useMicrophone(devices.selectedInput, devices.inputs);
  const rtcConfig = useRtcConfig();
  const iceServers = useMemo(
    () => rtcConfig.iceServers(),
    [rtcConfig.turn, rtcConfig.custom]
  );
  const call = useCall({ socket, mic, iceServers, friends });

  const updateProfile = useCallback(async (displayName) => {
    const api = createApiClient(token);
    const { data } = await api.patch('/users/me', { displayName });
    setProfile(data.user);
  }, [token]);

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-gray-100 overflow-hidden">
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Logo className="w-8 h-8" />
          <h1 className="text-base font-bold text-gray-100">Mic Share</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDeviceInfoOpen(true)}
            title="How Mic Share audio works"
            className="w-8 h-8 rounded flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-gray-100"
          >
            <InfoIcon />
          </button>
          <button
            onClick={onLogout}
            className="rounded bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-1.5 text-sm font-medium"
          >
            Log out
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col overflow-hidden">
          <FriendsPanel
            token={token}
            friends={friends}
            isOnline={isOnline}
            onFriendsChange={refreshFriends}
            socket={socket}
            sessions={call.sessions}
            startCall={call.startCall}
            hangup={call.hangup}
            initialRequests={initialRequests}
          />
          <div className="shrink-0 bg-gray-900 border-t border-gray-800 px-3 py-2.5 flex items-center gap-1.5">
            <div className="flex-1 min-w-0 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold select-none shrink-0">
                {(profile?.displayName || 'M').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-gray-100 font-semibold truncate leading-tight">
                  {profile?.displayName}
                </p>
                <p className="text-xs text-gray-500 truncate leading-tight">
                  @{profile?.username}
                </p>
              </div>
            </div>
            <button
              onClick={mic.toggleMute}
              title={mic.muted ? 'Unmute microphone' : 'Mute microphone'}
              className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${
                mic.muted
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-gray-100'
              }`}
            >
              {mic.muted ? <MicOffIcon /> : <MicIcon />}
            </button>
            <button
              onClick={() => setDeafened((v) => !v)}
              title={deafened ? 'Hear remote audio again' : 'Silence all remote audio'}
              className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${
                deafened
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-gray-100'
              }`}
            >
              {deafened ? <HeadphoneOffIcon /> : <HeadphoneIcon />}
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              title="Settings"
              className="w-8 h-8 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-gray-100 flex items-center justify-center shrink-0"
            >
              <GearIcon />
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {presenceError && (
            <p className="text-sm text-red-400 bg-red-900/30 rounded px-3 py-2 whitespace-pre-line">
              {presenceError}
            </p>
          )}

          {mic.capturing && (
            <CapturePanel
              selectedInput={devices.selectedInput}
              inputs={devices.inputs}
              mic={mic}
            />
          )}

          <SessionPanel
            incoming={call.incoming}
            sessions={call.sessions}
            acceptCall={call.acceptCall}
            declineCall={call.declineCall}
            hangup={call.hangup}
            playbackId={devices.selectedPlayback}
            routeId={devices.selectedOutput}
            deafened={deafened}
          />

          <SoundboardPanel
            routeId={devices.selectedOutput}
            playbackId={devices.selectedPlayback}
            devicesLoaded={devices.devices !== null}
          />
        </main>
      </div>

      <SettingsModal
        open={settingsOpen}
        devices={devices}
        turn={rtcConfig.turn}
        turnCustom={rtcConfig.custom}
        turnLoaded={rtcConfig.loaded}
        onSaveTurn={rtcConfig.save}
        profile={profile}
        onUpdateProfile={updateProfile}
        onClose={() => setSettingsOpen(false)}
      />

      <DeviceInfoModal open={deviceInfoOpen} onClose={() => setDeviceInfoOpen(false)} />
    </div>
  );
}
