// Local type definition avoiding Prisma generated types
interface MenuItem {
  name: string;
  price: number;
  category: string;
  preparationTime: number;
  isAvailable: boolean;
}

export interface OrderWithItems {
  id: string;
  createdAt: Date;
  items: OrderItemWithMenuItem[];
  waiter?: { name: string } | null;
  table?: { number: number } | null;
}

export interface OrderItemWithMenuItem {
  id: string;
  price: number;
  quantity: number;
  notes: string | null;
  status: string;
  createdAt: Date;
  menuItem: MenuItem;
}

export interface BillLineItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
  notes?: string;
}

export interface BillStructure {
  orderId: string;
  tableNumber?: number;
  waiterName: string;
  createdAt: string;
  items: BillLineItem[];
  subtotal: number;
  tax: number;
  total: number;
}

export function calculateOrderTotals(items: OrderItemWithMenuItem[]): { subtotal: number; tax: number; total: number } {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;
  
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

export function calculateBill(order: OrderWithItems): BillStructure {
  const items: BillLineItem[] = order.items.map((item) => ({
    name: item.menuItem.name,
    quantity: item.quantity,
    price: item.price,
    total: Math.round(item.price * item.quantity * 100) / 100,
    notes: item.notes || undefined,
  }));

  const { subtotal, tax, total } = calculateOrderTotals(order.items);

  return {
    orderId: order.id,
    tableNumber: order.table?.number,
    waiterName: order.waiter?.name || "Unknown",
    createdAt: order.createdAt.toISOString(),
    items,
    subtotal,
    tax,
    total,
  };
}

export function generateOrderSummary(items: OrderItemWithMenuItem[]): string {
  return items
    .map((item) => `${item.quantity}x ${item.menuItem.name}`)
    .join(", ");
}

export function hasExceededPrepTime(
  item: OrderItemWithMenuItem,
  estimatedMinutes: number
): boolean {
  if (item.status !== "PENDING") return false;
  
  const createdAt = new Date(item.createdAt).getTime();
  const now = Date.now();
  const elapsedMinutes = (now - createdAt) / (1000 * 60);
  
  return elapsedMinutes > estimatedMinutes;
}