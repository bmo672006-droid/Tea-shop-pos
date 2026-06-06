"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToasts } from "./toast-provider";

interface OrderItem {
  id: string;
  name?: string;
  menuItem?: { name: string };
  notes?: string | null;
  quantity: number;
  price?: number;
}

interface Order {
  id: string;
  type: string;
  tableNumber?: number | null;
  waiterName?: string | null;
  items?: OrderItem[];
  status: string;
  paymentStatus: string;
  totalAmount?: number;
  createdAt?: string;
}

export function OrdersView() {
  const { addToast } = useToasts();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders", "active"],
    queryFn: async () => {
      const token = localStorage.getItem("pos-token");
      const res = await fetch("/api/orders/active", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: { orders?: Order[] } = await res.json();
      return data.orders || [];
    },
    refetchInterval: 5000,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const token = localStorage.getItem("pos-token");
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      addToast("Order status updated", "success");
    },
    onError: () => addToast("Failed to update order", "error"),
  });

  const filteredOrders = statusFilter === "ALL"
    ? orders
    : orders?.filter((o: Order) => o.status === statusFilter);

  const statusColors: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-700",
    COOKING: "bg-blue-100 text-blue-700",
    READY: "bg-emerald-100 text-emerald-700",
    COMPLETED: "bg-gray-100 text-gray-700",
  };

  const paymentColors: Record<string, string> = {
    PENDING: "bg-gray-100 text-gray-600",
    PENDING_CONFIRMATION: "bg-violet-100 text-violet-700",
    CONFIRMED: "bg-emerald-100 text-emerald-700",
    CANCELLED: "bg-red-100 text-red-700",
  };

  if (isLoading) {
    return <div className="panel flex h-64 items-center justify-center text-sm font-medium text-gray-500">Loading orders...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="panel flex items-center justify-between gap-4 p-3">
        <p className="px-2 text-sm font-bold text-gray-700">{filteredOrders?.length || 0} orders</p>
        <div className="flex flex-wrap gap-2">
          {["ALL", "PENDING", "COOKING", "READY", "COMPLETED"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`tab-button ${
                statusFilter === status
                  ? "bg-gray-950 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {status === "ALL" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {filteredOrders?.map((order: Order) => (
          <div
            key={order.id}
            className="panel cursor-pointer p-4 transition hover:border-blue-200 hover:bg-blue-50/30"
            onClick={() => setSelectedOrder(order)}
          >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-sm font-bold text-gray-800">
                  {order.type === "DINE_IN" ? `T${order.tableNumber || "-"}` : "P"}
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold text-gray-950">
                    {order.type === "DINE_IN" ? `Table ${order.tableNumber || "N/A"}` : "Parcel"}
                  </p>
                  <p className="text-sm font-medium text-gray-500">
                    {order.waiterName} - {order.items?.length || 0} items
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 xl:justify-end">
                <span className={`status-pill ${statusColors[order.status]}`}>
                  {order.status}
                </span>
                <span className={`status-pill ${paymentColors[order.paymentStatus]}`}>
                  {order.paymentStatus.replace("_", " ")}
                </span>
                <p className="min-w-24 text-right text-lg font-bold text-gray-950">
                  ${order.totalAmount?.toFixed(2) || "0.00"}
                </p>
                {order.status !== "COMPLETED" && order.paymentStatus !== "PENDING_CONFIRMATION" && order.paymentStatus !== "CONFIRMED" && (
                  <div className="flex gap-2">
                    {order.status === "PENDING" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatus.mutate({ orderId: order.id, status: "COOKING" });
                        }}
                        className="primary-button py-1.5"
                      >
                        Start Cooking
                      </button>
                    )}
                    {order.status === "COOKING" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatus.mutate({ orderId: order.id, status: "READY" });
                        }}
                        className="primary-button bg-emerald-600 py-1.5 hover:bg-emerald-700"
                      >
                        Mark Ready
                      </button>
                    )}
                    {order.status === "READY" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatus.mutate({ orderId: order.id, status: "COMPLETED" });
                        }}
                        className="secondary-button py-1.5"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {(!filteredOrders || filteredOrders.length === 0) && (
          <div className="panel p-8 text-center text-sm font-medium text-gray-500">
            No orders found
          </div>
        )}
      </div>

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={(status) => {
            updateStatus.mutate({ orderId: selectedOrder.id, status });
            setSelectedOrder(null);
          }}
        />
      )}
    </div>
  );
}

function OrderDetailModal({
  order,
  onClose,
  onUpdateStatus,
}: {
  order: Order;
  onClose: () => void;
  onUpdateStatus: (status: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
      <div className="m-4 max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-950">
              {order.type === "DINE_IN" ? `Table ${order.tableNumber || "N/A"}` : "Parcel"}
            </h3>
            <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">
              &times;
            </button>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Waiter</p>
              <p className="font-medium text-gray-950">{order.waiterName || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Created</p>
              <p className="font-medium text-gray-950">
                {order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="font-medium text-gray-950">{order.status}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Payment</p>
              <p className="font-medium text-gray-950">{order.paymentStatus}</p>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="mb-3 font-semibold text-gray-950">Items</h4>
            <div className="space-y-2">
              {order.items?.map((item: OrderItem) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                  <div>
                    <p className="font-medium text-gray-950">{item.name || item.menuItem?.name}</p>
                    {item.notes && <p className="text-sm text-gray-500">Note: {item.notes}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-950">x{item.quantity}</p>
                    <p className="text-sm text-gray-500">${((item.price || 0) * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <p className="text-xl font-bold text-gray-950">Total: ${order.totalAmount?.toFixed(2) || "0.00"}</p>
            {order.status !== "COMPLETED" && order.paymentStatus !== "PENDING_CONFIRMATION" && order.paymentStatus !== "CONFIRMED" && (
              <div className="flex gap-2">
                {order.status === "PENDING" && (
                  <button onClick={() => onUpdateStatus("COOKING")} className="primary-button">
                    Start Cooking
                  </button>
                )}
                {order.status === "COOKING" && (
                  <button onClick={() => onUpdateStatus("READY")} className="primary-button bg-emerald-600 hover:bg-emerald-700">
                    Mark Ready
                  </button>
                )}
                {order.status === "READY" && (
                  <button onClick={() => onUpdateStatus("COMPLETED")} className="secondary-button">
                    Complete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
