"use client";

import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  unreadNotifications: number;
  markNotificationsRead: () => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  unreadNotifications: 0,
  markNotificationsRead: () => {},
});

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio("data:audio/wav;base64,UklGRl9vT19teleXBAABAAEARC");

    const token = localStorage.getItem("pos-token");
    if (!token) return;

    const socketInstance = io("http://localhost:3000", {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socketInstance.on("connect", () => {
      setSocket(socketInstance);
      setIsConnected(true);
      socketInstance.emit("restaurant:join", { restaurantId: "default" });
      socketInstance.emit("kitchen:join", { restaurantId: "default" });
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
    });

    socketInstance.on("order:created", (data: { tableNumber?: number }) => {
      setUnreadNotifications((prev) => prev + 1);
      audioRef.current?.play().catch(() => {});
      
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("New Order", { body: `Order for table ${data.tableNumber || "Parcel"}` });
      }
    });

    socketInstance.on("payment:requested", () => {
      setUnreadNotifications((prev) => prev + 1);
    });

    socketInstance.on("order:ready", () => {
      setUnreadNotifications((prev) => prev + 1);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const markNotificationsRead = () => setUnreadNotifications(0);

  return (
    <SocketContext.Provider value={{ socket, isConnected, unreadNotifications, markNotificationsRead }}>
      {children}
    </SocketContext.Provider>
  );
}
