import { io, Socket } from "socket.io-client";
import {
  SOCKET_EVENTS,
  getRoomName,
  type AuthPayload,
  type OrderEventPayload,
  type ItemEventPayload,
  type PaymentEventPayload,
  type SocketServerToClientEvent,
  type SocketClientToServerEvent,
} from "./types";

let socket: Socket | null = null;

export interface SocketClientOptions {
  url?: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

export function initSocketClient(options: SocketClientOptions = {}): Socket {
  const {
    url = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000",
    autoConnect = false,
    reconnection = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000,
  } = options;

  socket = io(url, {
    autoConnect,
    reconnection,
    reconnectionAttempts,
    reconnectionDelay,
    transports: ["websocket", "polling"],
  });

  socket.on("connect", () => {
    console.log("Socket connected");
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected");
  });

  socket.on("error", (error: Error) => {
    console.error("Socket error:", error);
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function connectWithToken(token: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!socket) {
      socket = initSocketClient();
    }

    socket.auth = { token };

    socket.connect();

    const onAuthSuccess = () => {
      socket?.off(SOCKET_EVENTS.AUTH_SUCCESS, onAuthSuccess);
      socket?.off(SOCKET_EVENTS.AUTH_ERROR, onAuthError);
      resolve();
    };

    const onAuthError = (data: { message: string }) => {
      socket?.off(SOCKET_EVENTS.AUTH_SUCCESS, onAuthSuccess);
      socket?.off(SOCKET_EVENTS.AUTH_ERROR, onAuthError);
      reject(new Error(data.message));
    };

    socket.on(SOCKET_EVENTS.AUTH_SUCCESS, onAuthSuccess);
    socket.on(SOCKET_EVENTS.AUTH_ERROR, onAuthError);

    socket.on(SOCKET_EVENTS.CONNECT_ERROR, (error: Error) => {
      socket?.off(SOCKET_EVENTS.AUTH_SUCCESS, onAuthSuccess);
      socket?.off(SOCKET_EVENTS.AUTH_ERROR, onAuthError);
      reject(error);
    });
  });
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinRestaurant(restaurantId: string): void {
  if (!socket?.connected) return;
  socket.emit(SOCKET_EVENTS.JOIN_RESTAURANT, { restaurantId });
}

export function leaveRestaurant(restaurantId: string): void {
  if (!socket?.connected) return;
  socket.emit(SOCKET_EVENTS.LEAVE_RESTAURANT, { restaurantId });
}

export function joinTable(tableId: string): void {
  if (!socket?.connected) return;
  socket.emit(SOCKET_EVENTS.JOIN_TABLE, { tableId });
}

export function leaveTable(tableId: string): void {
  if (!socket?.connected) return;
  socket.emit(SOCKET_EVENTS.LEAVE_TABLE, { tableId });
}

export function joinKitchen(restaurantId: string): void {
  if (!socket?.connected) return;
  socket.emit(SOCKET_EVENTS.JOIN_KITCHEN, { restaurantId });
}

export function leaveKitchen(restaurantId: string): void {
  if (!socket?.connected) return;
  socket.emit(SOCKET_EVENTS.LEAVE_KITCHEN, { restaurantId });
}

export type OrderEventHandler = (data: OrderEventPayload) => void;
export type ItemEventHandler = (data: ItemEventPayload) => void;
export type PaymentEventHandler = (data: PaymentEventPayload) => void;

export function onOrderCreated(handler: OrderEventHandler): void {
  socket?.on(SOCKET_EVENTS.ORDER_CREATED, handler);
}

export function onOrderUpdated(handler: OrderEventHandler): void {
  socket?.on(SOCKET_EVENTS.ORDER_UPDATED, handler);
}

export function onOrderCompleted(handler: (data: { orderId: string }) => void): void {
  socket?.on(SOCKET_EVENTS.ORDER_COMPLETED, handler);
}

export function onItemDelivered(handler: ItemEventHandler): void {
  socket?.on(SOCKET_EVENTS.ITEM_DELIVERED, handler);
}

export function onItemReady(handler: ItemEventHandler): void {
  socket?.on(SOCKET_EVENTS.ITEM_READY, handler);
}

export function onOrderReady(handler: (data: { orderId: string; tableNumber?: number }) => void): void {
  socket?.on(SOCKET_EVENTS.ORDER_READY, handler);
}

export function onPaymentRequested(handler: PaymentEventHandler): void {
  socket?.on(SOCKET_EVENTS.PAYMENT_REQUESTED, handler);
}

export function onPaymentConfirmed(handler: PaymentEventHandler): void {
  socket?.on(SOCKET_EVENTS.PAYMENT_CONFIRMED, handler);
}

export function offOrderCreated(handler: OrderEventHandler): void {
  socket?.off(SOCKET_EVENTS.ORDER_CREATED, handler);
}

export function offOrderUpdated(handler: OrderEventHandler): void {
  socket?.off(SOCKET_EVENTS.ORDER_UPDATED, handler);
}

export function offOrderCompleted(handler: (data: { orderId: string }) => void): void {
  socket?.off(SOCKET_EVENTS.ORDER_COMPLETED, handler);
}

export function offItemDelivered(handler: ItemEventHandler): void {
  socket?.off(SOCKET_EVENTS.ITEM_DELIVERED, handler);
}

export function offItemReady(handler: ItemEventHandler): void {
  socket?.off(SOCKET_EVENTS.ITEM_READY, handler);
}

export function offOrderReady(handler: (data: { orderId: string; tableNumber?: number }) => void): void {
  socket?.off(SOCKET_EVENTS.ORDER_READY, handler);
}

export function offPaymentRequested(handler: PaymentEventHandler): void {
  socket?.off(SOCKET_EVENTS.PAYMENT_REQUESTED, handler);
}

export function offPaymentConfirmed(handler: PaymentEventHandler): void {
  socket?.off(SOCKET_EVENTS.PAYMENT_CONFIRMED, handler);
}

export {
  socket,
  SOCKET_EVENTS,
  getRoomName,
  type AuthPayload,
  type OrderEventPayload,
  type ItemEventPayload,
  type PaymentEventPayload,
  type SocketServerToClientEvent,
  type SocketClientToServerEvent,
};
