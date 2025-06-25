'use server';

import { auth } from '../../../../auth';
import { db } from '@/lib/db';
import { userOpenChapters } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function toggleChapter(cookbookId: string, chapterId: string, isOpen: boolean) {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error('Must be authenticated');
  }

  if (isOpen) {
    // Insert if not exists (upsert)
    await db
      .insert(userOpenChapters)
      .values({
        userId: session.user.id,
        chapterId,
      })
      .onConflictDoNothing();
  } else {
    // Delete if exists
    await db
      .delete(userOpenChapters)
      .where(
        and(
          eq(userOpenChapters.userId, session.user.id),
          eq(userOpenChapters.chapterId, chapterId)
        )
      );
  }

  // Revalidate the cookbook page to reflect changes
  revalidatePath(`/kokebok/${cookbookId}`);
}