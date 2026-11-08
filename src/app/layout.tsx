import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BBET",
  description: "Gestione economica Sospesi, Master, Commissioni, LAY, Prelievi e Rendiconto",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${inter.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
