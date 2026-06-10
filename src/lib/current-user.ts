import 'server-only';
import { auth } from '@/auth';

// CLAUDE.md sin test-bruker — seedes av src/lib/db/seed.ts.
const SEED_USER_ID = '00091a95-ec3b-4119-b1cf-736bb7b02b9c';

// Innlogget bruker — eller seed-brukeren utenfor produksjon, så lokal utvikling fungerer uten
// OAuth-runden. I produksjon finnes ingen snarvei: null betyr ikke innlogget.
export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  if (session?.user?.id) return session.user.id;

  if (process.env.NODE_ENV !== 'production') return SEED_USER_ID;

  return null;
}
