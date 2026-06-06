"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToasts } from "./toast-provider";

interface KitchenItem {
  id: string;
  name?: string;
  menuItem?: { name: string };
  quantity: number;
  status: string;
  notes?: string | null;
  orderId?: string;
  tableNumber?: number | null;
}

interface KitchenOrder {
  id: string;
  tableNumber?: number | null;
  items?: KitchenItem[];
}

interface KitchenDisplayItem extends KitchenItem {
  orderId: string;
}

const columns = [
  { status: "PENDING", label: "Pending", tone: "border-amber-200 bg-amber-50 text-amber-700" },
  { status: "COOKING", label: "Cooking", tone: "border-blue-200 bg-blue-50 text-blue-700" },
  { status: "READY", label: "Ready", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
];

export function KitchenView() {
  const { addToast } = useToasts();
  const queryClient = useQueryClient();

  const { data: kitchenOrders, isLoading } = useQuery({
    queryKey: ["kitchen", "orders"],
    queryFn: async () => {
      const token = localStorage.getItem("pos-token");
      const res = await fetch("/api/kitchen/orders", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: { pending?: KitchenOrder[]; completed?: KitchenOrder[] } = await res.json();
      return [...(data.pending || []), ...(data.completed || [])];
    },
    refetchInterval: 3000,
  });

  const updateItemStatus = useMutation({
    mutationFn: async ({
      orderId,
      itemId,
      status,
    }: {
      orderId: string;
      itemId: string;
      status: string;
    }) => {
      const token = localStorage.getItem("pos-token");
      const res = await fetch(`/api/kitchen/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ itemId, status }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kitchen"] });
      addToast("Item status updated", "success");
    },
    onError: () => addToast("Failed to update item", "error"),
  });

  const deliverItem = useMutation({
    mutationFn: async ({ orderId, itemId }: { orderId: string; itemId: string }) => {
      const token = localStorage.getItem("pos-token");
      const res = await fetch(`/api/orders/${orderId}/items/${itemId}/deliver`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to deliver");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kitchen"] });
      addToast("Item delivered", "success");
    },
    onError: () => addToast("Failed to deliver item", "error"),
  });

  if (isLoading) {
    return <div className="panel flex h-64 items-center justify-center text-sm font-medium text-gray-500">Loading kitchen...</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      {columns.map((col) => {
        const items: KitchenDisplayItem[] = kitchenOrders?.flatMap((order: KitchenOrder) =>
          (order.items || [])
            ?.filter((item: KitchenItem) => item.status === col.status)
            .map((item: KitchenItem) => ({ ...item, orderId: order.id, tableNumber: order.tableNumber }))
        ) || [];

        return (
          <section key={col.status} className="panel min-h-96 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-950">{col.label}</h3>
                <p className="text-sm text-gray-500">{items.length} items</p>
              </div>
              <span className={`status-pill border ${col.tone}`}>{col.status}</span>
            </div>
            <div className="space-y-3">
              {items.map((item: KitchenDisplayItem) => (
                <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-700">
                      {item.tableNumber ? `Table ${item.tableNumber}` : "Parcel"}
                    </span>
                    <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700">{item.quantity}x</span>
                  </div>
                  <p className="mb-2 text-lg font-bold text-gray-950">{item.name || item.menuItem?.name}</p>
                  {item.notes && (
                    <p className="mb-3 rounded-md bg-amber-50 p-2 text-sm font-medium text-amber-700">
                      Note: {item.notes}
                    </p>
                  )}
                  {col.status === "PENDING" && (
                    <button
                      onClick={() =>
                        updateItemStatus.mutate({
                          orderId: item.orderId,
                          itemId: item.id,
                          status: "COOKING",
                        })
                      }
                      className="primary-button w-full"
                    >
                      Start Cooking
                    </button>
                  )}
                  {col.status === "COOKING" && (
                    <button
                      onClick={() =>
                        updateItemStatus.mutate({
                          orderId: item.orderId,
                          itemId: item.id,
                          status: "READY",
                        })
                      }
                      className="primary-button w-full bg-emerald-600 hover:bg-emerald-700"
                    >
                      Mark Ready
                    </button>
                  )}
                  {col.status === "READY" && (
                    <button
                      onClick={() => deliverItem.mutate({ orderId: item.orderId, itemId: item.id })}
                      className="primary-button w-full bg-gray-950 hover:bg-gray-800"
                    >
                      Deliver
                    </button>
                  )}
                </div>
              ))}
              {items.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-300 py-10 text-center text-sm font-medium text-gray-400">
                  No items
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
