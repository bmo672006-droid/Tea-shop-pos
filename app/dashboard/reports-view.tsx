"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

interface DailyReport {
  sales?: {
    totalSales?: number;
    ordersCompleted?: number;
    totalTax?: number;
    averageOrderValue?: number;
  };
  topItems?: TopItem[];
}

interface TopItem {
  id: string;
  name: string;
  category: string;
  totalQuantity: number;
  totalRevenue?: number;
}

interface ActiveOrderSummary {
  id: string;
  type: string;
  tableNumber?: number | null;
  waiterName?: string | null;
  totalAmount?: number;
  status: string;
}

export function ReportsView() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: report, isLoading } = useQuery({
    queryKey: ["reports", "daily", selectedDate],
    queryFn: async () => {
      const token = localStorage.getItem("pos-token");
      const res = await fetch(`/api/reports/daily?date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json() as Promise<DailyReport>;
    },
    refetchInterval: 30000,
  });

  const { data: orders } = useQuery({
    queryKey: ["orders", "active"],
    queryFn: async () => {
      const token = localStorage.getItem("pos-token");
      const res = await fetch("/api/orders/active", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: { orders?: ActiveOrderSummary[] } = await res.json();
      return data.orders || [];
    },
    refetchInterval: 10000,
  });

  if (isLoading) {
    return <div className="panel flex h-64 items-center justify-center text-sm font-medium text-gray-500">Loading reports...</div>;
  }

  const sales = report?.sales || {};
  const topItems = report?.topItems || [];
  const metrics = [
    { label: "Total Sales", value: `$${sales.totalSales?.toFixed(2) || "0.00"}`, tone: "text-emerald-600" },
    { label: "Orders Completed", value: sales.ordersCompleted || 0, tone: "text-blue-600" },
    { label: "Total Tax", value: `$${sales.totalTax?.toFixed(2) || "0.00"}`, tone: "text-amber-600" },
    { label: "Avg Order Value", value: `$${sales.averageOrderValue?.toFixed(2) || "0.00"}`, tone: "text-gray-950" },
  ];

  return (
    <div className="space-y-6">
      <div className="panel flex items-center justify-between gap-4 p-4">
        <p className="text-sm font-bold text-gray-700">Daily report date</p>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 outline-none transition focus:border-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="metric-card p-5">
            <p className="text-sm font-semibold text-gray-500">{metric.label}</p>
            <p className={`mt-2 text-3xl font-bold tracking-normal ${metric.tone}`}>{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="panel p-5">
          <h3 className="mb-4 text-base font-bold text-gray-950">Top Items</h3>
          {topItems.length > 0 ? (
            <div className="space-y-3">
              {topItems.map((item: TopItem, index: number) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-600">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-gray-950">{item.name}</p>
                      <p className="text-sm text-gray-500">{item.category}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold text-gray-950">{item.totalQuantity} sold</p>
                    <p className="text-sm text-gray-500">${item.totalRevenue?.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm font-medium text-gray-500">No data available</p>
          )}
        </div>

        <div className="panel p-5">
          <h3 className="mb-4 text-base font-bold text-gray-950">Active Orders Summary</h3>
          <div className="space-y-3">
            {orders?.slice(0, 8).map((order: ActiveOrderSummary) => (
              <div key={order.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                <div>
                  <p className="font-bold text-gray-950">
                    {order.type === "DINE_IN" ? `Table ${order.tableNumber || "N/A"}` : "Parcel"}
                  </p>
                  <p className="text-sm text-gray-500">{order.waiterName}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-950">${order.totalAmount?.toFixed(2) || "0.00"}</p>
                  <span className={`status-pill ${
                    order.status === "PENDING" ? "bg-amber-100 text-amber-700" :
                    order.status === "COOKING" ? "bg-blue-100 text-blue-700" :
                    order.status === "READY" ? "bg-emerald-100 text-emerald-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
            {(!orders || orders.length === 0) && (
              <p className="py-8 text-center text-sm font-medium text-gray-500">No active orders</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
