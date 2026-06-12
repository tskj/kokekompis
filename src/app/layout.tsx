import type { Metadata } from "next";
import { Geist, Fraunces, Caveat, Montserrat, Petit_Formal_Script } from "next/font/google";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getCurrentUserId } from "@/lib/current-user";
import { lesFont } from "@/lib/fonter";
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

// Brødteksten — Montserrat light er standarden; Times og Petit Formal kan velges i
// innstillingene, både for siden og for selve oppskriftene. Times-varianten er systemfont.
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

  const tekst     = lesFont(skrift?.tekstFont ?? 'montserrat');
  const oppskrift = lesFont(skrift?.oppskriftFont ?? 'montserrat');

  const tekstKlasse     = tekst === 'times' ? 'tekst-times'  : tekst === 'petit' ? 'tekst-petit'  : '';
  const oppskriftKlasse = oppskrift === 'times' ? 'skrift-times' : oppskrift === 'petit' ? 'skrift-petit' : '';

  return (
    <html lang="nb">
      <body
        className={`${geistSans.variable} ${fraunces.variable} ${caveat.variable} ${montserrat.variable} ${petitFormalScript.variable} ${tekstKlasse} ${oppskriftKlasse} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
