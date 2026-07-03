import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Standardgrensen for server actions er 1 MB — den avviste mobilbilder (3–10 MB) i stillhet
    // før importens egen 8 MB-sjekk fikk sett dem. Klienten krymper bildene før innsending
    // (BildeInput), men grensen må romme originalen når konverteringen ikke kan kjøre.
    serverActions: {
      bodySizeLimit: '10mb',
    },

    // Klient-routerens cache: et oppslag man alt har besøkt (eller prefetchet) serveres fra
    // minnet i 30 s i stedet for en ny serverrunde — det er dette som gjør byttet mellom
    // oppskrifter i en bok snappy. Mutasjoner revalidatePath-er og tømmer cachen uansett,
    // så ferskhet etter egne endringer er uberørt.
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
  },
};

export default nextConfig;
