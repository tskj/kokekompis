import { db } from './index';
import { cookbook, chapters, recipes, recipeChapters } from './schema';

const USER_ID = '00091a95-ec3b-4119-b1cf-736bb7b02b9c';

async function seed() {
  console.log('🌱 Seeding database...');

  // Create a test cookbook
  const [testCookbook] = await db
    .insert(cookbook)
    .values({
      userId: USER_ID,
      name: 'Min Første Kokebok',
    })
    .returning();

  console.log('📚 Created cookbook:', testCookbook.name);

  // Create chapters
  const [chapter1] = await db
    .insert(chapters)
    .values({
      cookbookId: testCookbook.id,
      name: 'Forretter',
      order: 1,
    })
    .returning();

  const [chapter2] = await db
    .insert(chapters)
    .values({
      cookbookId: testCookbook.id,
      name: 'Hovedretter',
      order: 2,
    })
    .returning();

  const [chapter3] = await db
    .insert(chapters)
    .values({
      cookbookId: testCookbook.id,
      name: 'Desserter',
      order: 3,
    })
    .returning();

  console.log('📖 Created chapters:', [chapter1.name, chapter2.name, chapter3.name]);

  // Create sample recipes
  const [recipe1] = await db
    .insert(recipes)
    .values({
      userId: USER_ID,
      title: 'Bruschetta med Tomat',
      description: 'Klassisk italiensk forrett med ferske tomater',
      content: {
        ingredients: [
          { name: 'Brød', amount: '4', unit: 'skiver' },
          { name: 'Tomater', amount: '3', unit: 'stk' },
          { name: 'Hvitløk', amount: '2', unit: 'fedd' },
          { name: 'Basilikum', amount: '1', unit: 'bunt' },
        ],
        instructions: [
          { step: 1, instruction: 'Rist brødskivene til de er gylne' },
          { step: 2, instruction: 'Skjær tomater i små terninger' },
          { step: 3, instruction: 'Bland tomater med hakket hvitløk og basilikum' },
          { step: 4, instruction: 'Legg tomatblandingen på brødskivene' },
        ],
        cookingTime: 15,
        servings: 4,
      },
    })
    .returning();

  const [recipe2] = await db
    .insert(recipes)
    .values({
      userId: USER_ID,
      title: 'Spaghetti Carbonara',
      description: 'Kremet pasta med egg, ost og bacon',
      content: {
        ingredients: [
          { name: 'Spaghetti', amount: '400', unit: 'g' },
          { name: 'Bacon', amount: '150', unit: 'g' },
          { name: 'Egg', amount: '3', unit: 'stk' },
          { name: 'Parmesan', amount: '100', unit: 'g' },
        ],
        instructions: [
          { step: 1, instruction: 'Kok pastaen al dente' },
          { step: 2, instruction: 'Stek bacon crispy' },
          { step: 3, instruction: 'Visp sammen egg og revet parmesan' },
          { step: 4, instruction: 'Bland alt sammen mens pastaen er varm' },
        ],
        cookingTime: 20,
        servings: 4,
      },
    })
    .returning();

  const [recipe3] = await db
    .insert(recipes)
    .values({
      userId: USER_ID,
      title: 'Tiramisu',
      description: 'Klassisk italiensk dessert med kaffe og mascarpone',
      content: {
        ingredients: [
          { name: 'Ladyfingers', amount: '200', unit: 'g' },
          { name: 'Mascarpone', amount: '500', unit: 'g' },
          { name: 'Egg', amount: '4', unit: 'stk' },
          { name: 'Kaffe', amount: '2', unit: 'dl' },
          { name: 'Kakao', amount: '2', unit: 'ss' },
        ],
        instructions: [
          { step: 1, instruction: 'Lag sterk kaffe og la den kjøle seg' },
          { step: 2, instruction: 'Visp egg og sukker til det er luftig' },
          { step: 3, instruction: 'Fold inn mascarpone forsiktig' },
          { step: 4, instruction: 'Dypp ladyfingers i kaffe og legg i lag' },
          { step: 5, instruction: 'Dryss kakao på toppen' },
        ],
        cookingTime: 30,
        servings: 8,
      },
    })
    .returning();

  console.log('🍳 Created recipes:', [recipe1.title, recipe2.title, recipe3.title]);

  // Link recipes to chapters
  await db.insert(recipeChapters).values([
    {
      recipeId: recipe1.id,
      chapterId: chapter1.id,
      order: 1,
    },
    {
      recipeId: recipe2.id,
      chapterId: chapter2.id,
      order: 1,
    },
    {
      recipeId: recipe3.id,
      chapterId: chapter3.id,
      order: 1,
    },
  ]);

  console.log('🔗 Linked recipes to chapters');
  console.log('✅ Seeding complete!');
  console.log(`📱 Visit: /kokebok/${testCookbook.id}`);

  process.exit(0);
}

seed().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});