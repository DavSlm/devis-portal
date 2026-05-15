import type { Metadata, Viewport } from 'next';
import { Raleway } from 'next/font/google';
import './globals.css';

const raleway = Raleway({
  variable: '--font-raleway',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Devis Oshibori — Configurez votre projet',
  description:
    'Configurez votre projet Oshibori en quelques minutes : matières, personnalisation, quantités. Devis personnalisé sous 24 h.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Required for env(safe-area-inset-*) to take effect on iPhone with notch / dynamic island.
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${raleway.variable} h-full antialiased`}>
      <body className="min-h-full bg-white text-ink">{children}</body>
    </html>
  );
}
