import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '@/config';
import { ObjectItem } from '@/types';

interface SocketCallbacks {
  onObjectCreated?: (object: ObjectItem) => void;
  onObjectDeleted?: (data: { id: string }) => void;
}

export const useSocket = (callbacks: SocketCallbacks) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, { transports: ['websocket'] });

    socketRef.current.on('connect', () => console.log('✅ Socket.IO mobile connecté'));

    socketRef.current.on('object:created', (object: ObjectItem) => {
      callbacks.onObjectCreated?.(object);
    });

    socketRef.current.on('object:deleted', (data: { id: string }) => {
      callbacks.onObjectDeleted?.(data);
    });

    return () => { socketRef.current?.disconnect(); };
  }, []);
};
