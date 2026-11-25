import type { Metadata, Viewport } from "next";
import "./globals.css";
import TabBar from "@/components/TabBar";

const DESCRIPTION =
  "ICT and Physics revision for HKDSE: short drills, quick notes and boss raids that make the exam feel smaller.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.BETTER_AUTH_URL ?? "https://ai.ssc.edu.hk"),
  title: {
    default: "Learner — DSE drills, notes and boss raids",
    template: "%s · Learner",
  },
  description: DESCRIPTION,
  applicationName: "Learner",
  robots: { index: false },
  formatDetection: { telephone: false, email: false, address: false },
  appleWebApp: { capable: true, title: "Learner", statusBarStyle: "default" },
  openGraph: {
    type: "website",
    siteName: "Learner",
    locale: "en_HK",
    title: "Learner — DSE drills, notes and boss raids",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: "Learner — DSE drills, notes and boss raids",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F2EFE6",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-HK">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Space+Grotesk:wght@500;700&family=JetBrains+Mono:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="app"><main className="page">{children}</main></div>
        <TabBar />
      </body>
    </html>
  );
}
