import { useEffect, useState } from 'react';
import { createSocket } from '../lib/socket';

export function useSocket(token) {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!token) {
      setSocket(null);
      return undefined;
    }
    const connection = createSocket(token);
    setSocket(connection);
    return () => {
      connection.disconnect();
    };
  }, [token]);

  return socket;
}
