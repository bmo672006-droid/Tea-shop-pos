"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "./sidebar";
import { Overview } from "./overview";
import { OrdersView } from "./orders-view";
import { KitchenView } from "./kitchen-view";
import { TablesView } from "./tables-view";
import { ReportsView } from "./reports-view";
import { SettingsView } from "./settings-view";
import { WaiterManagementView } from "./waiter-management-view";
import { LoginForm } from "./login-form";
import { useSocket } from "./socket-provider";
import { Bell, CalendarDays } from "lucide-react";

type TabType = "overview" | "orders" | "kitchen" | "tables" | "reports" | "settings" | "waiters";

const tabMeta: Record<TabType, { title: string; eyebrow: string; description: string }> = {
  overview: {
    title: "Operations Overview",
    eyebrow: "Today",
    description: "Live order flow, floor status, and sales signals.",
  },
  orders: {
    title: "Orders",
    eyebrow: "Service",
    description: "Track active checks, cooking progress, and payments.",
  },
  kitchen: {
    title: "Kitchen Display",
    eyebrow: "Production",
    description: "Prioritize items from pending through ready.",
  },
  tables: {
    title: "Table Management",
    eyebrow: "Floor",
    description: "Monitor table state, cleaning, and payment holds.",
  },
  waiters: {
    title: "Waiter Management",
    eyebrow: "Staff",
    description: "Create waiter PINs and manage mobile sessions.",
  },
  reports: {
    title: "Reports",
    eyebrow: "Analytics",
    description: "Review daily sales, item velocity, and order mix.",
  },
  settings: {
    title: "Settings",
    eyebrow: "Admin",
    description: "Manage users, access, and account security.",
  },
};

export function DashboardLayout() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const { isConnected, unreadNotifications, markNotificationsRead } = useSocket();

  const { data: session, isLoading, refetch } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <div className="pos-shell flex items-center justify-center">
        <div className="panel px-5 py-4 text-sm font-medium text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  if (!session?.user) {
    return <LoginForm onLogin={() => refetch()} />;
  }

  const handleLogout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    await refetch();
  };

  return (
    <div className="pos-shell flex h-screen overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        userName={session.user.name}
        userEmail={session.user.email}
        userRole={session.user.role}
        onLogout={handleLogout}
        onTabChange={(tab) => setActiveTab(tab as TabType)}
      />
      <div className="pos-main flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="pos-header sticky top-0 z-20 flex min-h-20 items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <div className="min-w-0">
            <p className="page-kicker">{tabMeta[activeTab].eyebrow}</p>
            <div className="mt-1 flex flex-wrap items-end gap-x-4 gap-y-1">
              <h1 className="page-title">{tabMeta[activeTab].title}</h1>
              <p className="page-subtitle pb-0.5">{tabMeta[activeTab].description}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm md:flex">
              <CalendarDays className="h-4 w-4 text-gray-500" />
              {new Date().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm">
              <span className={`h-2.5 w-2.5 rounded-full ${isConnected ? "bg-emerald-500" : "bg-red-500"}`} />
              {isConnected ? "Live" : "Offline"}
            </div>
            <button
              type="button"
              onClick={markNotificationsRead}
              className="relative rounded-lg border border-gray-200 bg-white p-2.5 text-gray-600 shadow-sm transition hover:bg-gray-50"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadNotifications > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-5 py-6 lg:px-8">
          {activeTab === "overview" && <Overview />}
          {activeTab === "orders" && <OrdersView />}
          {activeTab === "kitchen" && <KitchenView />}
          {activeTab === "tables" && <TablesView />}
          {activeTab === "reports" && <ReportsView />}
          {activeTab === "settings" && <SettingsView />}
          {activeTab === "waiters" && <WaiterManagementView />}
        </main>
      </div>
    </div>
  );
}
