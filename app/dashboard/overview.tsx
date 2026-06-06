"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Clock, DollarSign, ListOrdered, TrendingUp, Utensils } from "lucide-react";

interface Order {
  id: string;
  tableId: string | null;
  tableNumber?: number;
  status: string;
  paymentStatus: string;
  type: string;
  waiterName: string;
  hasDelayedItems?: boolean;
  totalAmount: number;
  items?: unknown[];
}

interface Table {
  id: string;
  number: number;
  status: string;
}

export function Overview() {
  const { data: orders } = useQuery({
    queryKey: ["orders", "active"],
    queryFn: async () => {
      const token = localStorage.getItem("pos-token");
      const res = await fetch("/api/orders/active", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.orders;
    },
    refetchInterval: 10000,
  });

  const { data: tables } = useQuery({
    queryKey: ["tables"],
    queryFn: async () => {
      const token = localStorage.getItem("pos-token");
      const res = await fetch("/api/tables", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.tables || [];
    },
    refetchInterval: 15000,
  });

  const { data: dailyReport } = useQuery({
    queryKey: ["reports", "daily"],
    queryFn: async () => {
      const token = localStorage.getItem("pos-token");
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(`/api/reports/daily?date=${today}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    refetchInterval: 30000,
  });

  const activeOrders = orders?.length || 0;
  const pendingPayments = orders?.filter((o: Order) => o.paymentStatus === "PENDING_CONFIRMATION").length || 0;
  const delayedOrders = orders?.filter((o: Order) => o.hasDelayedItems).length || 0;
  const todayRevenue = dailyReport?.sales?.totalSales || 0;

  const stats = [
    {
      title: "Active Orders",
      value: activeOrders,
      icon: TrendingUp,
      iconColor: "text-blue-500",
      helper: "Open checks",
    },
    {
      title: "Pending Payments",
      value: pendingPayments,
      icon: Clock,
      iconColor: "text-amber-500",
      helper: "Need counter action",
    },
    {
      title: "Delayed Orders",
      value: delayedOrders,
      icon: AlertCircle,
      iconColor: "text-red-500",
      helper: "Past target time",
    },
    {
      title: "Today's Revenue",
      value: `$${todayRevenue.toFixed(2)}`,
      icon: DollarSign,
      iconColor: "text-emerald-500",
      helper: "Confirmed sales",
    },
  ];

  return (
    <div className="animate-fade-in space-y-6 pb-8">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="metric-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-500">{stat.title}</p>
                  <p className="mt-2 text-3xl font-bold tracking-normal text-gray-950">{stat.value}</p>
                  <p className="mt-1 text-xs font-medium text-gray-500">{stat.helper}</p>
                </div>
                <div className="icon-tile">
                  <Icon className={cn("h-5 w-5", stat.iconColor)} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="panel p-5 xl:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-950">Floor Status</h3>
              <p className="mt-1 text-sm text-gray-500">Tables grouped by current operational state.</p>
            </div>
            <Utensils className="h-5 w-5 text-gray-400" />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {tables?.map((table: Table) => {
              const hasActiveOrder = orders?.some(
                (o: Order) => o.tableId === table.id && o.status !== "COMPLETED"
              );
              const isPendingPayment = orders?.some(
                (o: Order) => o.tableId === table.id && o.paymentStatus === "PENDING_CONFIRMATION"
              );

              let statusClasses = "border-emerald-200 bg-emerald-50 text-emerald-700";
              let dotClasses = "bg-emerald-500";
              let statusText = "Available";

              if (isPendingPayment) {
                statusClasses = "border-amber-200 bg-amber-50 text-amber-700";
                dotClasses = "bg-amber-500";
                statusText = "Payment";
              } else if (hasActiveOrder) {
                statusClasses = "border-red-200 bg-red-50 text-red-700";
                dotClasses = "bg-red-500";
                statusText = "Occupied";
              }

              return (
                <div
                  key={table.id}
                  className={cn(
                    "flex min-h-28 flex-col justify-between rounded-lg border p-4 transition hover:border-gray-300 hover:bg-white",
                    statusClasses
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wide opacity-80">{statusText}</span>
                    <span className={cn("h-2.5 w-2.5 rounded-full", dotClasses)} />
                  </div>
                  <span className="text-2xl font-bold tracking-normal text-gray-950">T{table.number}</span>
                </div>
              );
            })}
            {(!tables || tables.length === 0) && (
              <div className="col-span-full rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
                No tables configured
              </div>
            )}
          </div>
        </div>

        <div className="panel flex flex-col p-5">
          <div className="mb-5">
            <h3 className="text-base font-bold text-gray-950">Recent Orders</h3>
            <p className="mt-1 text-sm text-gray-500">Most recent active checks.</p>
          </div>
          <div className="flex-1 space-y-3">
            {orders?.slice(0, 5).map((order: Order) => (
              <div
                key={order.id}
                className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white p-3 transition hover:border-blue-200 hover:bg-blue-50/40"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 font-bold text-gray-800">
                    {order.tableNumber ? `T${order.tableNumber}` : "P"}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-gray-950">
                      {order.type === "DINE_IN" ? "Dine In" : "Parcel"}
                    </p>
                    <p className="truncate text-xs font-medium text-gray-500">
                      {order.waiterName} - {order.items?.length || 0} items
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-bold text-gray-950">${order.totalAmount.toFixed(2)}</p>
                  <span
                    className={cn(
                      "status-pill mt-1",
                      order.status === "PENDING" && "bg-amber-100 text-amber-700",
                      order.status === "COOKING" && "bg-blue-100 text-blue-700",
                      order.status === "READY" && "bg-emerald-100 text-emerald-700",
                      order.paymentStatus === "PENDING_CONFIRMATION" && "bg-violet-100 text-violet-700"
                    )}
                  >
                    {order.paymentStatus === "PENDING_CONFIRMATION" ? "Payment" : order.status}
                  </span>
                </div>
              </div>
            ))}
            {(!orders || orders.length === 0) && (
              <div className="flex h-full flex-col items-center justify-center py-10 text-gray-500">
                <ListOrdered className="mb-3 h-10 w-10 opacity-30" />
                <p className="text-sm font-medium">No active orders</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
