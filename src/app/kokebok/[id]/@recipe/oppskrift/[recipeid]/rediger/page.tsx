import { and, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { recipes, recipeContentSchema } from '@/lib/db/schema';
import { getCookbookAndRecipeIdParams } from '@/lib/uuid/server-uuid-params';
import { getCurrentUserId } from '@/lib/current-user';
import { uuidHref } from '@/lib/uuid/uuid-links';
import { RedigerSkjema } from '@/components/rediger/RedigerSkjema';

interface RedigerPageProps {
  params: Promise<{ id: string; recipeid: string }>;
}

// Redigering er en bevisst modus man går INN i (design-dokumentet: aldri noe som kan skje ved et
// uhell fra bakeviewet) — derfor en egen side, ikke knapper strødd over visningen. Kun for
// oppskriftens eier — gjester i en utstilt bok leser, de redigerer ikke.
export default async function RedigerPage({ params }: RedigerPageProps) {
  const { cookbookId, recipeId } = await getCookbookAndRecipeIdParams(params);

  const userId = await getCurrentUserId();
  if (!userId) notFound();

  const oppskrift = await db
    .select({ title: recipes.title, description: recipes.description, content: recipes.content })
    .from(recipes)
    .where(and(eq(recipes.id, recipeId), eq(recipes.cookbookId, cookbookId), eq(recipes.userId, userId)))
    .maybeSingle('oppskrift.rediger');
  if (!oppskrift) notFound();

  return (
    <RedigerSkjema
      recipeId={recipeId}
      tittel={oppskrift.title}
      beskrivelse={oppskrift.description}
      content={recipeContentSchema.parse(oppskrift.content)}
      avbrytHref={uuidHref`/kokebok/${cookbookId}/oppskrift/${recipeId}`}
    />
  );
}
