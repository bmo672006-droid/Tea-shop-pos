import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "POS Admin Dashboard",
  description: "Modern restaurant management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-surface-50 text-foreground transition-colors duration-300">{children}</body>
    </html>
  );
}
