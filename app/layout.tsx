import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Rye } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Fonte "faroeste" para títulos (tema saloon).
const rye = Rye({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Love Letter",
  description: "Love Letter multiplayer — jogue com os amigos",
  appleWebApp: { capable: true, title: "Love Letter", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon-192.png", apple: "/apple-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#160e0b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${rye.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
