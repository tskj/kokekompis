import type { Metadata } from "next";
import { Geist, Fraunces, Caveat, Alegreya, Montserrat, Petit_Formal_Script } from "next/font/google";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getCurrentUserId } from "@/lib/current-user";
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

// Brødteksten — en klassisk bokserif som hører sammen med papirbakgrunnen (sansen gjorde det
// ikke). Geist beholdes som font-sans der et nøytralt UI-innslag trenger den.
const alegreya = Alegreya({
  variable: "--font-alegreya",
  subsets: ["latin"],
});

// Marens fontprøving (velges under «Aa skrift» på forsiden): Montserrat light som alternativ
// brødtekst, og Petit Formal Script for selve oppskriftene. Times-varianten er systemfont.
const montserrat = Montserrat({
  variable: "--font-montserrat",
  weight: ["300", "500"],
  subsets: ["latin"],
});

const petitFormalScript = Petit_Formal_Script({
  variable: "--font-petit",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kokekompis",
  description: "Din levende kokebok — oppskriftene dine, slik du vil ha dem.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // skriftvalgene følger brukeren — klassene på body bytter brødtekst og oppskriftsskrift
  const userId = await getCurrentUserId();
  const skrift = userId
    ? await db
        .select({ tekstFont: users.tekstFont, oppskriftFont: users.oppskriftFont })
        .from(users)
        .where(eq(users.id, userId))
        .maybeSingle('layout.skrift')
    : null;

  const tekstKlasse     = skrift?.tekstFont === 'montserrat' ? 'tekst-montserrat'
                        : skrift?.tekstFont === 'times'      ? 'tekst-times'
                        :                                      '';
  const oppskriftKlasse = skrift?.oppskriftFont === 'petit' ? 'skrift-petit' : '';

  return (
    <html lang="nb">
      <body
        className={`${geistSans.variable} ${fraunces.variable} ${caveat.variable} ${alegreya.variable} ${montserrat.variable} ${petitFormalScript.variable} ${tekstKlasse} ${oppskriftKlasse} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
