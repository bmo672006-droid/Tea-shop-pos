"use client";

import {
  LayoutDashboard,
  ListOrdered,
  ChefHat,
  LayoutGrid,
  BarChart3,
  Settings,
  UserCheck,
  LogOut,
  ReceiptText
} from "lucide-react";

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

interface SidebarProps {
  activeTab: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  onLogout: () => Promise<void>;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "orders", label: "Orders", icon: ListOrdered },
  { id: "kitchen", label: "Kitchen", icon: ChefHat },
  { id: "tables", label: "Tables", icon: LayoutGrid },
  { id: "waiters", label: "Waiters", icon: UserCheck },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

export function Sidebar({ activeTab, userName, userEmail, userRole, onLogout, onTabChange }: SidebarProps) {
  return (
    <aside className="pos-sidebar flex w-64 shrink-0 flex-col">
      <div className="border-b border-white/10 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-gray-950">
            <ReceiptText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-normal text-white">
              Nexus POS
            </h1>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Admin Console</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-3 px-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">
          Main Menu
        </div>
        <ul className="space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <li key={tab.id}>
                <button
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition",
                    isActive
                      ? "bg-white text-gray-950"
                      : "text-gray-400 hover:bg-white/[0.08] hover:text-white"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive ? "text-blue-600" : "text-gray-500 group-hover:text-white")} strokeWidth={2.2} />
                  <span className="truncate">{tab.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="mt-auto border-t border-white/10 p-4">
        <div className="rounded-lg bg-white/[0.04] p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
              {getInitials(userName)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{userName || "Admin User"}</p>
              <p className="truncate text-xs text-gray-400">{userRole || "Admin"}</p>
            </div>
          </div>
          {userEmail && <p className="mt-3 truncate text-xs text-gray-500">{userEmail}</p>}
          <button
            type="button"
            onClick={onLogout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-gray-300 transition hover:bg-red-500/10 hover:text-red-300"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}

function getInitials(name?: string) {
  if (!name) return "A";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "A";
}
