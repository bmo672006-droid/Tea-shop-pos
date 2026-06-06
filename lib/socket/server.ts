import { Server as SocketIOServer, Socket } from "socket.io";
import type { Server as HTTPServer } from "http";
import { verifyToken } from "./auth";
import {
  SOCKET_EVENTS,
  ServerSocketData,
  getRoomName,
  type SocketServerToClientEvent,
  type SocketClientToServerEvent,
} from "./types";

let io: SocketIOServer | null = null;

export function getIO(): SocketIOServer | null {
  return io;
}

export function initSocketServer(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use(authenticateSocket);
  io.on(SOCKET_EVENTS.CONNECTION, handleConnection);

  return io;
}

async function authenticateSocket(
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> {
  try {
    const token = socket.handshake.auth.token as string | undefined;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    const payload = await verifyToken(token);

    if (!payload) {
      return next(new Error("Invalid token"));
    }

    const socketData: ServerSocketData = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      restaurantId: payload.restaurantId,
      joinedRooms: new Set<string>(),
    };

    (socket as Socket & { data: ServerSocketData }).data = socketData;

    next();
  } catch (error) {
    next(error instanceof Error ? error : new Error("Authentication failed"));
  }
}

function handleConnection(socket: Socket): void {
  const socketData = (socket as Socket & { data: ServerSocketData }).data;

  console.log(`User connected: ${socketData.userId} (${socketData.role})`);

  socket.emit(SOCKET_EVENTS.AUTH_SUCCESS, {
    userId: socketData.userId,
    message: "Connected successfully",
  });

  socket.on(SOCKET_EVENTS.JOIN_RESTAURANT, (data: SocketClientToServerEvent[typeof SOCKET_EVENTS.JOIN_RESTAURANT]) => {
    joinRestaurantRoom(socket, data.restaurantId);
  });

  socket.on(SOCKET_EVENTS.LEAVE_RESTAURANT, (data: SocketClientToServerEvent[typeof SOCKET_EVENTS.LEAVE_RESTAURANT]) => {
    leaveRestaurantRoom(socket, data.restaurantId);
  });

  socket.on(SOCKET_EVENTS.JOIN_TABLE, (data: SocketClientToServerEvent[typeof SOCKET_EVENTS.JOIN_TABLE]) => {
    joinTableRoom(socket, data.tableId);
  });

  socket.on(SOCKET_EVENTS.LEAVE_TABLE, (data: SocketClientToServerEvent[typeof SOCKET_EVENTS.LEAVE_TABLE]) => {
    leaveTableRoom(socket, data.tableId);
  });

  socket.on(SOCKET_EVENTS.JOIN_KITCHEN, (data: SocketClientToServerEvent[typeof SOCKET_EVENTS.JOIN_KITCHEN]) => {
    joinKitchenRoom(socket, data.restaurantId);
  });

  socket.on(SOCKET_EVENTS.LEAVE_KITCHEN, (data: SocketClientToServerEvent[typeof SOCKET_EVENTS.LEAVE_KITCHEN]) => {
    leaveKitchenRoom(socket, data.restaurantId);
  });

  socket.on(SOCKET_EVENTS.DISCONNECT, () => {
    handleDisconnect(socket);
  });
}

function handleDisconnect(socket: Socket): void {
  const socketData = (socket as Socket & { data: ServerSocketData }).data;

  console.log(`User disconnected: ${socketData.userId}`);

  for (const room of socketData.joinedRooms) {
    socket.leave(room);
  }
  socketData.joinedRooms.clear();
}

function joinRestaurantRoom(socket: Socket, restaurantId: string): void {
  const room = getRoomName("restaurant", restaurantId);
  socket.join(room);
  (socket as Socket & { data: ServerSocketData }).data.joinedRooms.add(room);
  console.log(`User joined restaurant room: ${room}`);
}

function leaveRestaurantRoom(socket: Socket, restaurantId: string): void {
  const room = getRoomName("restaurant", restaurantId);
  socket.leave(room);
  (socket as Socket & { data: ServerSocketData }).data.joinedRooms.delete(room);
  console.log(`User left restaurant room: ${room}`);
}

function joinTableRoom(socket: Socket, tableId: string): void {
  const room = getRoomName("table", tableId);
  socket.join(room);
  (socket as Socket & { data: ServerSocketData }).data.joinedRooms.add(room);
  console.log(`User joined table room: ${room}`);
}

function leaveTableRoom(socket: Socket, tableId: string): void {
  const room = getRoomName("table", tableId);
  socket.leave(room);
  (socket as Socket & { data: ServerSocketData }).data.joinedRooms.delete(room);
  console.log(`User left table room: ${room}`);
}

function joinKitchenRoom(socket: Socket, restaurantId: string): void {
  const room = getRoomName("kitchen", restaurantId);
  socket.join(room);
  (socket as Socket & { data: ServerSocketData }).data.joinedRooms.add(room);
  console.log(`User joined kitchen room: ${room}`);
}

function leaveKitchenRoom(socket: Socket, restaurantId: string): void {
  const room = getRoomName("kitchen", restaurantId);
  socket.leave(room);
  (socket as Socket & { data: ServerSocketData }).data.joinedRooms.delete(room);
  console.log(`User left kitchen room: ${room}`);
}

export function emitToRestaurant<T extends keyof SocketServerToClientEvent>(
  restaurantId: string,
  event: T,
  payload: SocketServerToClientEvent[T]
): void {
  if (!io) return;
  const room = getRoomName("restaurant", restaurantId);
  io.to(room).emit(event, payload);
}

export function emitToTable<T extends keyof SocketServerToClientEvent>(
  tableId: string,
  event: T,
  payload: SocketServerToClientEvent[T]
): void {
  if (!io) return;
  const room = getRoomName("table", tableId);
  io.to(room).emit(event, payload);
}

export function emitToKitchen<T extends keyof SocketServerToClientEvent>(
  restaurantId: string,
  event: T,
  payload: SocketServerToClientEvent[T]
): void {
  if (!io) return;
  const room = getRoomName("kitchen", restaurantId);
  io.to(room).emit(event, payload);
}

export function emitToAll<T extends keyof SocketServerToClientEvent>(
  event: T,
  payload: SocketServerToClientEvent[T]
): void {
  if (!io) return;
  io.emit(event, payload);
}
