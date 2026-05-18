import type { Metadata } from "next";
import { Inter, Outfit, Space_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "PitPlan.io — BBQ Competition Finder",
  description: "Find BBQ competitions near you from KCBS, MBN, SCA, FBA, IBCA, and more — all in one place.",
};

import { Providers } from "./providers";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable} ${spaceMono.variable} antialiased bg-[#111111] text-[#F5F5F0] font-inter selection:bg-[#E85D04] selection:text-[#F5F5F0] overflow-hidden`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

