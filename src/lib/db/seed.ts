import { deriveDbUrl } from '../../../scripts/db-name.mjs';
import { skillingsboller, sjokoladekake, pannekaker, focaccia, fiskesuppe, vaniljekrem, skoleboller } from '@/lib/db/seed-oppskrifter';

// Point this process at the per-worktree database BEFORE @/lib/db reads DATABASE_URL — hence the
// dynamic imports inside seed() rather than static ones. Run via `pnpm db:seed`.
process.env.DATABASE_URL = deriveDbUrl(process.env.DATABASE_URL ?? '');

const USER_ID = '00091a95-ec3b-4119-b1cf-736bb7b02b9c';

async function seed() {
  const { db } = await import('@/lib/db');
  const { cookbook, chapters, recipes, recipeChapters, recipeNotes, recipeShares, recipeLinks, users, recipeContentSchema } = await import('@/lib/db/schema');

  console.log('🌱 Seeding database...');

  await db.transaction(async (tx) => {
    console.log('🧹 Cleaning existing data...');
    await tx.delete(cookbook);
    await tx.delete(recipes);

    // Seed-brukeren (CLAUDE.md sin test-bruker) — må finnes for FK-ene.
    await tx
      .insert(users)
      .values({ id: USER_ID, name: 'Maren', email: 'maren@kokekompis.no', admin: true })
      .onConflictDoNothing();

    // privat, som alle bøker — innsyn gis kun via delingslenker
    const [marensKokebok] = await tx
      .insert(cookbook)
      .values({
        userId: USER_ID,
        name: 'Marens kokebok',
        farge: 'terra',
        headerBilde: 'striper',
        beskrivelse: 'Alt mormor aldri målte opp — samlet, prøvd og rettet.',
        skisse: 'croissant',
      })
      .returning();

    const allChapters = await tx
      .insert(chapters)
      .values([
        { cookbookId: marensKokebok.id, name: 'Gjærbakst', order: 1 },
        { cookbookId: marensKokebok.id, name: 'Kaker', order: 2 },
        { cookbookId: marensKokebok.id, name: 'Middag', order: 3 },
      ])
      .returning();

    const [gjaerbakst, kaker, middag] = allChapters;
    console.log('📖 Created chapters:', allChapters.map((c) => c.name));

    // Valider innholdet mot skjemaet allerede her — et seed-innhold som ikke parser er en bug nå,
    // ikke når siden først leser raden. Vaniljekremen legges bevisst UTEN kapittel (ukategorisert).
    const innhold = [
      { title: 'Mormors skillingsboller', description: 'Myke kanelboller slik mormor lagde dem — tunge av kardemomme og kanel.', content: skillingsboller },
      { title: 'Sjokoladekake i langpanne', description: 'Den saftige klassikeren med blank kakaoglasur og kokos.', content: sjokoladekake },
      { title: 'Mammas pannekaker', description: 'Tynne pannekaker med svellet røre, akkurat som på lørdagene hjemme.', content: pannekaker },
      { title: 'Focaccia med rosmarin', description: 'Italiensk langpannebrød med dype oljegroper og flaksalt.', content: focaccia },
      { title: 'Pappas fiskesuppe', description: 'Kremet suppe der laksen trekker, aldri koker.', content: fiskesuppe },
      { title: 'Skoleboller', description: 'Hvetebolle, vaniljekrem, glasur og kokos — i riktig rekkefølge.', content: skoleboller },
      { title: 'Vaniljekrem', description: 'Grunnoppskriften — til skoleboller, berlinerboller og skje.', content: vaniljekrem },
    ].map((r) => ({ ...r, userId: USER_ID, cookbookId: marensKokebok.id, content: recipeContentSchema.parse(r.content) }));

    const allRecipes = await tx.insert(recipes).values(innhold).returning();
    console.log('🍳 Created recipes:', allRecipes.map((r) => r.title));

    const [boller, kake, pannekakeRad, focacciaRad, suppe, skolebolleRad, vaniljekremRad] = allRecipes;

    await tx.insert(recipeChapters).values([
      { recipeId: boller.id, chapterId: gjaerbakst.id, order: 1 },
      { recipeId: focacciaRad.id, chapterId: gjaerbakst.id, order: 2 },
      { recipeId: skolebolleRad.id, chapterId: gjaerbakst.id, order: 3 },
      { recipeId: kake.id, chapterId: kaker.id, order: 1 },
      { recipeId: pannekakeRad.id, chapterId: middag.id, order: 1 },
      { recipeId: suppe.id, chapterId: middag.id, order: 2 },
    ]);

    // Skolebollen peker på vaniljekremen — hopp dit og tilbake uten å miste stedet sitt.
    await tx.insert(recipeLinks).values([
      { fromRecipeId: skolebolleRad.id, toRecipeId: vaniljekremRad.id },
    ]);

    // Et par lapper på bollene + en delingslenke på kaken, så alle visningene har noe å vise.
    await tx.insert(recipeNotes).values([
      { recipeId: boller.id, userId: USER_ID, tekst: 'Mormor brukte alltid litt mer kanel — gjør det.', farge: 'rav' },
      { recipeId: boller.id, userId: USER_ID, tekst: 'Prøvd med 11 min i steketid — perfekt i vår ovn.', farge: 'terrakotta' },
    ]);
    await tx.insert(recipeShares).values([{ recipeId: kake.id }]);

    console.log('🔗 Linked recipes, notes and a share');
  });

  console.log('✅ Seeding complete!');

  process.exit(0);
}

seed().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
