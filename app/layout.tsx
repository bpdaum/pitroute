import type { Metadata } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "PitRoute.io — BBQ Competition Finder",
  description: "Find BBQ competitions near you from KCBS, MBN, SCA, FBA, IBCA, and more — all in one place.",
};

import { Providers } from "./providers";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${bebasNeue.variable} antialiased bg-zinc-950 text-zinc-100`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
