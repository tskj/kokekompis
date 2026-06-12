import 'server-only';
import { cache } from 'react';
import { auth } from '@/auth';

// CLAUDE.md sin test-bruker — seedes av src/lib/db/seed.ts.
const SEED_USER_ID = '00091a95-ec3b-4119-b1cf-736bb7b02b9c';

// Innlogget bruker — eller seed-brukeren under lokal utvikling, så `pnpm dev` fungerer uten
// OAuth-runden. Testene kjører som produksjon: null betyr ikke innlogget — ellers kunne ingen
// test utforske hvordan appen ter seg for en utlogget gjest.
// React cache(): layout, side og default-slot spør alle om brukeren i samme request — én
// auth()-runde holder. (Utenfor RSC-miljøet, som i testene, er cache() en ren gjennomgang.)
export const getCurrentUserId = cache(async (): Promise<string | null> => {
  const session = await auth();
  if (session?.user?.id) return session.user.id;

  if (process.env.NODE_ENV === 'development') return SEED_USER_ID;

  return null;
});
