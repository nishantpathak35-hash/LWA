import '../app/globals.css';
import { Toaster } from '../components/ui/Toast';

export const metadata = {
  title: 'PTS · LUXEWORX ATELIER INTERIOR PRIVATE LIMITED',
  description: 'PTS payment tracking system',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-gradient-to-br from-slate-950 via-[#0a0f1d] to-[#0f172a] text-slate-100 min-h-screen font-sans selection:bg-gold/20 selection:text-gold overflow-x-hidden antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
