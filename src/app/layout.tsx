import type { Metadata } from "next";
import { Geist, Fraunces, Caveat } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Displayserifen — overskrifter og titler, kokebok-stemmen.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

// Håndskriften — postit-lapper og små personlige innslag.
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kokekompis",
  description: "Din levende kokebok — oppskriftene dine, slik du vil ha dem.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nb">
      <body
        className={`${geistSans.variable} ${fraunces.variable} ${caveat.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
