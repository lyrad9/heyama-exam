"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { ObjectItem } from "@/src/types";

interface SocketCallbacks {
  onObjectCreated?: (object: ObjectItem) => void;
  onObjectDeleted?: (data: { id: string }) => void;
}

export const useSocket = (callbacks: SocketCallbacks) => {
  const socketRef = useRef<Socket | null>(null);
  const callbacksRef = useRef(callbacks);

  // Mettre à jour les callbacks sans relancer le useEffect
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    const url = process.env.NODE_ENV === "development" 
      ? "http://localhost:3000" 
      : process.env.NEXT_PUBLIC_SOCKET_URL!;

    socketRef.current = io(url, {
      transports: ["websocket"], // Recommandé pour la production
    });

    socketRef.current.on("connect", () => {
      console.log("✅ Socket.IO web connecté");
    });

    socketRef.current.on("object:created", (object: ObjectItem) => {
      callbacksRef.current.onObjectCreated?.(object);
    });

    socketRef.current.on("object:deleted", (data: { id: string }) => {
      callbacksRef.current.onObjectDeleted?.(data);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);
};

