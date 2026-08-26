const fs = require('fs');
const path = require('path');

const targetDir = 'C:/Users/Admin/Desktop/Construct-O-Genie';
const marketingDir = path.join(targetDir, 'components/marketing');
const appDir = path.join(targetDir, 'app');

// Ensure directories exist
[
  marketingDir,
  path.join(appDir, 'privacy'),
  path.join(appDir, 'terms'),
  path.join(appDir, 'security'),
  path.join(appDir, 'contact')
].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

console.log('Building enterprise-grade site in Construct-O-Genie...');

// 1. app/layout.js
const layoutCode = `import "./globals.css";
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from "next/font/google";

const displayFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const bodyFont = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const viewport = {
  themeColor: "#030508",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata = {
  metadataBase: new URL("https://www.constructogenie.in"),
  title: "Construct-O-Genie — The Operating System for Turnkey Interiors & Fit-Out",
  description: "Run every fit-out project with total margin certainty. Living BOQ, itemized procurement caps, mobile site DPRs, certified JMR billing, and bi-directional Tally & SAP sync.",
  keywords: [
    "turnkey interior software",
    "fit-out construction OS",
    "BOQ margin protection",
    "Tally Prime construction sync",
    "JMR measurement record",
    "commercial fit-out ERP",
  ],
  authors: [{ name: "Construct-O-Genie Technologies" }],
  openGraph: {
    title: "Construct-O-Genie — From Bare Shell to Certified Handover",
    description: "Run every fit-out project with total margin certainty. Manage budgets, procurement, execution, and billing from one connected platform.",
    url: "https://www.constructogenie.in",
    siteName: "Construct-O-Genie",
    images: [
      {
        url: "/hero-interior.jpg",
        width: 1200,
        height: 630,
        alt: "Construct-O-Genie Executive Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Construct-O-Genie — Fit-Out Construction OS",
    description: "Living BOQ, Site DPRs, Maker/Checker Approvals, and Tally/SAP ERP Invoicing.",
    images: ["/hero-interior.jpg"],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-32x32.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={\`\${displayFont.variable} \${bodyFont.variable} \${monoFont.variable} dark\`}>
      <body className="bg-[#030508] text-slate-100 antialiased font-sans selection:bg-white/20 selection:text-white">
        {children}
      </body>
    </html>
  );
}
`;
fs.writeFileSync(path.join(appDir, 'layout.js'), layoutCode, 'utf8');

// 2. app/globals.css
const globalsCss = `@tailwind base;
@tailwind components;
@tailwind utilities;

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --font-display: var(--font-display, "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
  --font-body: var(--font-body, "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
  --font-mono: var(--font-mono, "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace);
  --bg-obsidian: #030508;
}

html {
  scroll-behavior: smooth;
  color-scheme: dark;
  -webkit-tap-highlight-color: transparent;
}

body {
  background: var(--bg-obsidian);
  color: #f8fafc;
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  overflow-x: hidden;
  letter-spacing: -0.011em;
}

/* Tabular numbers for financial and metric presentation */
.font-mono, td, .metric-val {
  font-feature-settings: "tnum" 1, "zero" 1;
}

::selection {
  background: rgba(255, 255, 255, 0.22);
  color: #ffffff;
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: #030508;
}
::-webkit-scrollbar-thumb {
  background: #27272a;
  border-radius: 999px;
}
::-webkit-scrollbar-thumb:hover {
  background: #3f3f46;
}

@layer utilities {
  .scrollbar-none::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-none {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
}
`;
fs.writeFileSync(path.join(appDir, 'globals.css'), globalsCss, 'utf8');

console.log('App root files updated!');
