"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToasts } from "./toast-provider";

interface Table {
  id: string;
  number: number;
  capacity: number;
  status: string;
  activeOrder?: {
    status: string;
    paymentStatus: string;
    totalAmount: number;
  } | null;
}

export function TablesView() {
  const { addToast } = useToasts();
  const queryClient = useQueryClient();

  const { data: tables, isLoading } = useQuery({
    queryKey: ["tables"],
    queryFn: async () => {
      const token = localStorage.getItem("pos-token");
      const res = await fetch("/api/tables", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: { tables?: Table[] } = await res.json();
      return data.tables || [];
    },
    refetchInterval: 5000,
  });

  const updateTableStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const token = localStorage.getItem("pos-token");
      const res = await fetch("/api/tables", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("Failed to update table");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
      addToast("Table status updated", "success");
    },
    onError: () => addToast("Failed to update table", "error"),
  });

  if (isLoading) {
    return <div className="panel flex h-64 items-center justify-center text-sm font-medium text-gray-500">Loading tables...</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {tables?.map((table: Table) => {
        const hasActiveOrder = table.activeOrder && table.activeOrder.status !== "COMPLETED";
        const isPendingPayment = table.activeOrder?.paymentStatus === "PENDING_CONFIRMATION";

        let tone = "bg-emerald-100 text-emerald-700";
        let dot = "bg-emerald-500";
        let statusText = table.status;

        if (isPendingPayment) {
          tone = "bg-violet-100 text-violet-700";
          dot = "bg-violet-500";
          statusText = "PAYMENT";
        } else if (hasActiveOrder) {
          tone = "bg-red-100 text-red-700";
          dot = "bg-red-500";
          statusText = "OCCUPIED";
        } else if (table.status === "CLEANING") {
          tone = "bg-amber-100 text-amber-700";
          dot = "bg-amber-500";
        }

        return (
          <div key={table.id} className="panel p-5">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-500">Table</p>
                <h3 className="text-3xl font-bold tracking-normal text-gray-950">{table.number}</h3>
              </div>
              <span className={`h-3 w-3 rounded-full ${dot}`} />
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Capacity</span>
                <span className="font-bold text-gray-950">{table.capacity} seats</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`status-pill ${tone}`}>{statusText}</span>
              </div>
              {table.activeOrder && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Order</span>
                    <span className="font-bold text-gray-950">${table.activeOrder.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Payment</span>
                    <span className="font-bold text-gray-950">{table.activeOrder.paymentStatus}</span>
                  </div>
                </>
              )}
            </div>

            {!hasActiveOrder && table.status === "OCCUPIED" && (
              <button
                onClick={() => updateTableStatus.mutate({ id: table.id, status: "AVAILABLE" })}
                className="primary-button mt-5 w-full bg-emerald-600 hover:bg-emerald-700"
              >
                Mark Available
              </button>
            )}
            {table.status === "AVAILABLE" && (
              <button
                onClick={() => updateTableStatus.mutate({ id: table.id, status: "CLEANING" })}
                className="secondary-button mt-5 w-full"
              >
                Mark Cleaning
              </button>
            )}
            {table.status === "CLEANING" && (
              <button
                onClick={() => updateTableStatus.mutate({ id: table.id, status: "AVAILABLE" })}
                className="primary-button mt-5 w-full bg-emerald-600 hover:bg-emerald-700"
              >
                Mark Available
              </button>
            )}
          </div>
        );
      })}
      {(!tables || tables.length === 0) && (
        <div className="panel col-span-full p-8 text-center text-sm font-medium text-gray-500">
          No tables configured
        </div>
      )}
    </div>
  );
}
