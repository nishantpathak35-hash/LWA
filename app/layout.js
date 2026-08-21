import '../app/globals.css';
import { Toaster } from '../components/ui/Toast';

export const viewport = {
  themeColor: '#080A0C',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata = {
  title: 'Construct-O-Genie | Interior & Fit-Out Management Software',
  description: 'Construct-O-Genie connects design, BOQs, procurement, site execution, billing and finance in one operating system built for interior and fit-out companies.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Construct-O-Genie'
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
      <body className="bg-gradient-to-br from-slate-950 via-[#0a0f1d] to-[#0f172a] text-slate-100 min-h-screen font-sans selection:bg-gold/20 selection:text-gold overflow-x-hidden antialiased" suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
