"use client";

import { useState } from "react";
import { useSocket } from "./socket-provider";
import { Bell, LogOut, User } from "lucide-react";

interface TopBarProps {
  userName?: string;
  onLogout: () => Promise<void>;
}

export function TopBar({ userName, onLogout }: TopBarProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { isConnected, unreadNotifications, markNotificationsRead } = useSocket();

  const handleNotificationClick = () => {
    markNotificationsRead();
  };

  return (
    <header className="h-20 bg-white/70 backdrop-blur-xl border-b border-white/20 flex items-center justify-between px-8 sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-4">
        {/* Placeholder for breadcrumbs or page title if needed */}
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white shadow-sm border border-gray-100">
          <div className={cn(
            "w-2.5 h-2.5 rounded-full relative",
            isConnected ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500"
          )}>
            {isConnected && <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" />}
          </div>
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            {isConnected ? "Live" : "Offline"}
          </span>
        </div>
        
        <button
          onClick={handleNotificationClick}
          className="relative p-2.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-full transition-all duration-300"
        >
          <Bell className="w-5 h-5" />
          {unreadNotifications > 0 && (
            <span className="absolute 2 top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white shadow-sm">
              {unreadNotifications > 9 ? "9+" : unreadNotifications}
            </span>
          )}
        </button>
        
        <div className="flex items-center gap-4 pl-6 border-l border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-linear-to-br from-brand-100 to-brand-50 rounded-full flex items-center justify-center border border-brand-200 shadow-sm text-brand-700">
              <User className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-gray-900">{userName || "User"}</span>
              <span className="text-xs text-gray-500">Admin</span>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              setIsLoggingOut(true);
              try {
                await onLogout();
              } finally {
                setIsLoggingOut(false);
              }
            }}
            disabled={isLoggingOut}
            className="ml-2 p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all duration-300 disabled:opacity-60"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}
