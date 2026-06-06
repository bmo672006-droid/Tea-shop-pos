export const SOCKET_EVENTS = {
  ORDER_CREATED: "order:created",
  ORDER_UPDATED: "order:updated",
  ORDER_COMPLETED: "order:completed",
  ITEM_DELIVERED: "item:delivered",
  ITEM_READY: "item:ready",
  ORDER_READY: "order:ready",
  PAYMENT_REQUESTED: "payment:requested",
  PAYMENT_CONFIRMED: "payment:confirmed",
  PAYMENT_CANCELLED: "payment:cancelled",
  CONNECTION: "connect",
  DISCONNECT: "disconnect",
  CONNECT_ERROR: "connect_error",
  ERROR: "error",
  AUTH_REQUEST: "auth:request",
  AUTH_SUCCESS: "auth:success",
  AUTH_ERROR: "auth:error",
  JOIN_ROOM: "room:join",
  LEAVE_ROOM: "room:leave",
  JOIN_TABLE: "table:join",
  LEAVE_TABLE: "table:leave",
  JOIN_KITCHEN: "kitchen:join",
  LEAVE_KITCHEN: "kitchen:leave",
  JOIN_RESTAURANT: "restaurant:join",
  LEAVE_RESTAURANT: "restaurant:leave",
} as const;

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

export interface AuthPayload {
  userId: string;
  email: string;
  role: "SUPER_ADMIN" | "MANAGER" | "COUNTER" | "WAITER";
  restaurantId: string;
}

export interface JoinRoomPayload {
  roomId: string;
}

export interface OrderEventPayload {
  orderId: string;
  tableId?: string;
  waiterId?: string;
  waiterName?: string;
  tableNumber?: number;
  items: Array<{
    menuItemId: string;
    name: string;
    quantity: number;
    price: number;
    notes?: string;
  }>;
  totalAmount: number;
  type: "DINE_IN" | "PARCEL";
  status: string;
  createdAt: string;
  timestamp: string;
}

export interface ItemEventPayload {
  orderId: string;
  itemId: string;
  menuItemId: string;
  name: string;
  quantity: number;
  status: "PENDING" | "COOKING" | "READY" | "DELIVERED";
  deliveredBy?: string;
  deliveredAt?: string;
  tableNumber?: number;
  notes?: string;
}

export interface PaymentEventPayload {
  orderId: string;
  paymentId: string;
  amount: number;
  method: "CASH" | "CARD" | "UPI";
  status: "PENDING" | "CONFIRMED";
  initiatedBy: string;
  initiatedByName?: string;
  confirmedBy?: string;
  confirmedAt?: string;
  createdAt: string;
}

export interface TableEventPayload {
  tableId: string;
  tableNumber: number;
  capacity: number;
  status: "AVAILABLE" | "OCCUPIED" | "CLEANING";
  currentOrderId?: string;
}

export type SocketServerToClientEvent = {
  [SOCKET_EVENTS.ORDER_CREATED]: OrderEventPayload;
  [SOCKET_EVENTS.ORDER_UPDATED]: OrderEventPayload;
  [SOCKET_EVENTS.ORDER_COMPLETED]: { orderId: string; tableId?: string };
  [SOCKET_EVENTS.ITEM_DELIVERED]: ItemEventPayload;
  [SOCKET_EVENTS.ITEM_READY]: ItemEventPayload;
  [SOCKET_EVENTS.ORDER_READY]: { orderId: string; tableNumber?: number };
  [SOCKET_EVENTS.PAYMENT_REQUESTED]: PaymentEventPayload;
  [SOCKET_EVENTS.PAYMENT_CONFIRMED]: PaymentEventPayload;
  [SOCKET_EVENTS.PAYMENT_CANCELLED]: { orderId: string; paymentId: string; reason?: string };
  [SOCKET_EVENTS.AUTH_SUCCESS]: { userId: string; message: string };
  [SOCKET_EVENTS.AUTH_ERROR]: { message: string };
};

export type SocketClientToServerEvent = {
  [SOCKET_EVENTS.AUTH_REQUEST]: { token: string };
  [SOCKET_EVENTS.JOIN_ROOM]: JoinRoomPayload;
  [SOCKET_EVENTS.LEAVE_ROOM]: JoinRoomPayload;
  [SOCKET_EVENTS.JOIN_TABLE]: { tableId: string };
  [SOCKET_EVENTS.LEAVE_TABLE]: { tableId: string };
  [SOCKET_EVENTS.JOIN_KITCHEN]: { restaurantId: string };
  [SOCKET_EVENTS.LEAVE_KITCHEN]: { restaurantId: string };
  [SOCKET_EVENTS.JOIN_RESTAURANT]: { restaurantId: string };
  [SOCKET_EVENTS.LEAVE_RESTAURANT]: { restaurantId: string };
};

export interface ServerSocketData {
  userId: string;
  email: string;
  role: "SUPER_ADMIN" | "MANAGER" | "COUNTER" | "WAITER";
  restaurantId: string;
  joinedRooms: Set<string>;
}

export type RoomType = "restaurant" | "table" | "kitchen";

export function getRoomName(type: RoomType, id: string): string {
  return `${type}:${id}`;
}

export function parseRoomName(roomName: string): { type: RoomType; id: string } | null {
  const [type, id] = roomName.split(":") as [RoomType, string];
  if (!type || !id) return null;
  if (!["restaurant", "table", "kitchen"].includes(type)) return null;
  return { type, id };
}