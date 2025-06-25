'use server';

import { auth } from '@/auth';
import { db } from '@/lib/db';
import { userOpenChapters } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function openChapter(chapterId: string) {
  const session = await auth();
  if (!session?.user?.id) return;

  await db
    .insert(userOpenChapters)
    .values({
      userId: session.user.id,
      chapterId,
    })
    .onConflictDoNothing();
}

export async function closeChapter(chapterId: string) {
  const session = await auth();
  if (!session?.user?.id) return;

  await db
    .delete(userOpenChapters)
    .where(
      and(
        eq(userOpenChapters.userId, session.user.id),
        eq(userOpenChapters.chapterId, chapterId)
      )
    );
}
