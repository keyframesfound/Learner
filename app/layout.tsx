import type { Metadata, Viewport } from "next";
import { Archivo_Black, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import TabBar from "@/components/TabBar";
import { getStats, viewer } from "@/lib/repo";

/* Typography — Archivo Black display, Space Grotesk body, JetBrains Mono labels.
   next/font downloads these at build time and serves them from /_next/static/media,
   so the page never waits on fonts.googleapis.com and a blocked Google cannot
   drop the app back to system fonts. */
const display = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-archivo-black",
  display: "swap",
});
const body = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  /* the tab bar's badge is the streak, so it needs the signed-in member */
  const v = await viewer();
  const streak = v ? (await getStats(v.id)).streak : 0;
  return (
    <html lang="en-HK" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <div className="app"><main className="page">{children}</main></div>
        <TabBar badge={streak} />
      </body>
    </html>
  );
}
