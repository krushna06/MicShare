import { io } from 'socket.io-client';
import { getServerUrl } from './api';

export function createSocket(token, options = {}) {
  return io(getServerUrl(), {
    auth: { token },
    transports: ['websocket'],
    ...options,
  });
}
