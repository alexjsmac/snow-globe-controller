import type { Metadata } from 'next';
import { QueueMonitorProvider } from '@/components/QueueMonitorProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'The Polar Vault | Immersive Photobooth Expedition',
  description:
    'An immersive winter symphony inside a shipping container. Control the lights, choose your theme, and capture the moment.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <QueueMonitorProvider>{children}</QueueMonitorProvider>
      </body>
    </html>
  );
}
