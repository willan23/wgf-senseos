import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

export const metadata: Metadata = {
  title: 'WGF SenseOS — Wi-Fi Sensing Platform',
  description:
    'Plataforma SaaS privacy-first de Wi-Fi Sensing para segurança residencial sem câmeras e analytics corporativo inteligente.',
  keywords: ['wifi sensing', 'csi', 'people counting', 'indoor tracking', 'privacy', 'security'],
  authors: [{ name: 'WGF SenseOS' }],
  openGraph: {
    title: 'WGF SenseOS',
    description: 'Segurança e analytics por Wi-Fi, sem câmeras.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
