"use client";

import { QueryProvider } from "./providers";
import { DashboardLayout } from "./dashboard/dashboard-layout";
import { SocketProvider } from "./dashboard/socket-provider";
import { ToastProvider } from "./dashboard/toast-provider";

export default function Home() {
  return (
    <QueryProvider>
      <ToastProvider>
        <SocketProvider>
          <DashboardLayout />
        </SocketProvider>
      </ToastProvider>
    </QueryProvider>
  );
}