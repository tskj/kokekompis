'use server';

import { auth } from '@/auth';
import { db } from '@/lib/db';
import { userOpenChapters } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function toggleChapter(cookbookId: string, chapterId: string, isOpen: boolean) {
  const session = await auth();
  if (!session?.user?.id) return;

  if (isOpen) {
    await db
      .insert(userOpenChapters)
      .values({
        userId: session.user.id,
        chapterId,
      })
      .onConflictDoNothing();
  } else {
    await db
      .delete(userOpenChapters)
      .where(
        and(
          eq(userOpenChapters.userId, session.user.id),
          eq(userOpenChapters.chapterId, chapterId)
        )
      );
  }
}
