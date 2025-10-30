import type { Metadata } from "next";
import { QueueMonitorProvider } from "@/components/QueueMonitorProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Christmas Magic Installation",
  description: "Interactive Christmas-themed installation - Pick your theme and join the queue!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <QueueMonitorProvider>
          {children}
        </QueueMonitorProvider>
      </body>
    </html>
  );
}
