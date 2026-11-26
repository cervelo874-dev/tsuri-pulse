import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';

export const metadata: Metadata = {
  title: 'ツリパルス（TsuriPulse）｜場所を選ぶだけで釣れる時間がわかる近未来ソナーダッシュボード',
  description:
    '天気・風速・風向・潮の動き・魚種別釣れやすさスコア・持ち物・釣果ログがパッと見でわかる、釣り初心者にも優しい無料PWA釣りアプリ。AI相棒ソナまる搭載。',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ツリパルス',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#041529',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" data-theme="night" suppressHydrationWarning>
      <body className="min-h-dvh antialiased selection:bg-cyan-400/30">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
