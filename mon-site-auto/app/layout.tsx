import type { Metadata } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import StickyContact from "@/components/StickyContact";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Autologgia – Véhicules premium",
  description:
    "Achetez, vendez ou estimez votre véhicule premium avec Autologgia.",
  verification: {
    google: "xrDbgqANd_2frVnbtvV64c_B88_2gzpHxMP4eJzmYag",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="relative min-h-full flex flex-col bg-navy">
        {children}
        <StickyContact />
      </body>
    </html>
  );
}
