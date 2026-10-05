import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { Analytics } from "@vercel/analytics/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} — Autonomous Data Quality & Natural-Language Intelligence`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    "Data Quality",
    "Data Profiling",
    "AI SQL Chat",
    "SaaS Analytics",
    "Automated Dashboards",
    "TraceImpact",
  ],
  authors: [{ name: "TraceImpact Team" }],
  creator: "TraceImpact",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://cloud.traceimpact.com",
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#090d16] text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
