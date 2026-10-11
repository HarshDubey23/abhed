import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kavach — Accountability OS for AI agents',
  description: 'One registry, one rulebook and one tamper-evident ledger for a workforce of people and AI agents.',
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M12 1.8 3.6 5v6.4c0 5.1 3.5 9.6 8.4 10.8 4.9-1.2 8.4-5.7 8.4-10.8V5L12 1.8Zm0 4.2a3 3 0 0 1 1.3 5.7l.9 5.1H9.8l.9-5.1A3 3 0 0 1 12 6Z'/%3E%3C/svg%3E",
  },
};

export const viewport: Viewport = { themeColor: '#000000', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900&family=Instrument+Serif:ital@1&family=JetBrains+Mono:wght@400;500&family=DM+Sans:opsz,wght@9..40,400;9..40,500&family=Epilogue:wght@900&display=swap"
        />
      </head>
      <body style={{ background: '#000', color: '#fff' }}>{children}</body>
    </html>
  );
}
