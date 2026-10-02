import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

const plexSans = localFont({
  src: "../public/fonts/ibm-plex-sans-var.woff2",
  variable: "--font-plex-sans",
  weight: "400 600",
  display: "swap",
});

const plexMono = localFont({
  src: [
    { path: "../public/fonts/ibm-plex-mono-400.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/ibm-plex-mono-500.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/ibm-plex-mono-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-plex-mono",
  display: "swap",
});

const instrumentSerif = localFont({
  src: [
    { path: "../public/fonts/instrument-serif-regular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/instrument-serif-italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-instrument-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ThreatDelta — CTI analyst workbench",
  description:
    "Compare public cyber threat intelligence snapshots, inspect evidence, review detection coverage and plan hunts.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable} ${instrumentSerif.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
