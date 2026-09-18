import '../app/globals.css';
import { Toaster } from '../components/ui/Toast';

export const viewport = {
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata = {
  title: 'PTS · LUXEWORX ATELIER INTERIOR PRIVATE LIMITED',
  description: 'PTS payment tracking system',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'LWA ERP'
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-background text-foreground min-h-screen font-sans overflow-x-hidden antialiased" suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
