import { db } from './index';
import { cookbook, chapters, recipes, recipeChapters } from './schema';

const USER_ID = '00091a95-ec3b-4119-b1cf-736bb7b02b9c';

async function seed() {
  console.log('🌱 Seeding database...');

  await db.transaction(async (tx) => {
    // Clean slate - delete cookbook (cascades to everything else)
    console.log('🧹 Cleaning existing data...');
    await tx.delete(cookbook);
    console.log('✅ Cleaned existing data (cascaded)');

    // Create a test cookbook
    const [testCookbook] = await tx
      .insert(cookbook)
      .values({
        userId: USER_ID,
        name: 'Min Første Kokebok',
      })
      .returning();

    console.log('📚 Created cookbook:', testCookbook.name);

    // Create chapters
    const [chapter1] = await tx
      .insert(chapters)
      .values({
        cookbookId: testCookbook.id,
        name: 'Forretter',
        order: 1,
      })
      .returning();

    const [chapter2] = await tx
      .insert(chapters)
      .values({
        cookbookId: testCookbook.id,
        name: 'Hovedretter',
        order: 2,
      })
      .returning();

    const [chapter3] = await tx
      .insert(chapters)
      .values({
        cookbookId: testCookbook.id,
        name: 'Desserter',
        order: 3,
      })
      .returning();

    console.log('📖 Created chapters:', [chapter1.name, chapter2.name, chapter3.name]);

    // Create all recipes
    const allRecipes = await tx
      .insert(recipes)
      .values([
        // Forretter
        {
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
        },
        {
          userId: USER_ID,
          title: 'Caprese Salat',
          description: 'Enkel italiensk salat med mozzarella og basilikum',
          content: {
            ingredients: [
              { name: 'Mozzarella', amount: '250', unit: 'g' },
              { name: 'Tomater', amount: '4', unit: 'stk' },
              { name: 'Basilikum', amount: '1', unit: 'bunt' },
              { name: 'Balsamico', amount: '2', unit: 'ss' },
              { name: 'Olivenolje', amount: '3', unit: 'ss' },
            ],
            instructions: [
              { step: 1, instruction: 'Skjær mozzarella og tomater i skiver' },
              { step: 2, instruction: 'Legg alternerende på et fat' },
              { step: 3, instruction: 'Topp med frisk basilikum' },
              { step: 4, instruction: 'Drypp over olivenolje og balsamico' },
            ],
            cookingTime: 10,
            servings: 4,
          },
        },
        {
          userId: USER_ID,
          title: 'Hjemmelaget Hummus',
          description: 'Kremet hummus med tahini og hvitløk',
          content: {
            ingredients: [
              { name: 'Kikerter', amount: '400', unit: 'g' },
              { name: 'Tahini', amount: '3', unit: 'ss' },
              { name: 'Sitron', amount: '1', unit: 'stk' },
              { name: 'Hvitløk', amount: '2', unit: 'fedd' },
              { name: 'Olivenolje', amount: '2', unit: 'ss' },
              { name: 'Paprika', amount: '1', unit: 'ts' },
            ],
            instructions: [
              { step: 1, instruction: 'Kjør alle ingredienser i food processor' },
              { step: 2, instruction: 'Tilsett vann til ønsket konsistens' },
              { step: 3, instruction: 'Smak til med salt og pepper' },
              { step: 4, instruction: 'Server med paprika og olivenolje på toppen' },
            ],
            cookingTime: 15,
            servings: 6,
          },
        },
        // Hovedretter
        {
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
        },
        {
          userId: USER_ID,
          title: 'Sopp Risotto',
          description: 'Kremet risotto med blandede sopp og parmesan',
          content: {
            ingredients: [
              { name: 'Arborio ris', amount: '300', unit: 'g' },
              { name: 'Blandede sopp', amount: '400', unit: 'g' },
              { name: 'Løk', amount: '1', unit: 'stk' },
              { name: 'Hvitvin', amount: '1', unit: 'dl' },
              { name: 'Kraft', amount: '8', unit: 'dl' },
              { name: 'Parmesan', amount: '100', unit: 'g' },
              { name: 'Smør', amount: '2', unit: 'ss' },
            ],
            instructions: [
              { step: 1, instruction: 'Stek sopp og løk til de er myke' },
              { step: 2, instruction: 'Tilsett ris og stek i 2 minutter' },
              { step: 3, instruction: 'Hell i hvitvin og rør til absorbert' },
              { step: 4, instruction: 'Tilsett kraft gradvis under konstant røring' },
              { step: 5, instruction: 'Rør inn smør og parmesan til slutt' },
            ],
            cookingTime: 35,
            servings: 4,
          },
        },
        {
          userId: USER_ID,
          title: 'Stekt Laks med Dill',
          description: 'Saftig laks med kremet dillsaus',
          content: {
            ingredients: [
              { name: 'Laksfilet', amount: '600', unit: 'g' },
              { name: 'Dill', amount: '1', unit: 'bunt' },
              { name: 'Rømme', amount: '2', unit: 'dl' },
              { name: 'Sitron', amount: '1', unit: 'stk' },
              { name: 'Hvitløk', amount: '1', unit: 'fedd' },
              { name: 'Smør', amount: '2', unit: 'ss' },
            ],
            instructions: [
              { step: 1, instruction: 'Krydre laksen med salt og pepper' },
              { step: 2, instruction: 'Stek laksen i smør, 3-4 min per side' },
              { step: 3, instruction: 'Bland rømme, dill, sitron og hvitløk' },
              { step: 4, instruction: 'Server laksen med dillsausen ved siden' },
            ],
            cookingTime: 20,
            servings: 4,
          },
        },
        // Dessert
        {
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
        },
      ])
      .returning();

    console.log('🍳 Created recipes:', allRecipes.map(r => r.title));

    // Link recipes to chapters with proper ordering
    await tx.insert(recipeChapters).values([
      // Forretter (3 recipes)
      { recipeId: allRecipes[0].id, chapterId: chapter1.id, order: 1 }, // Bruschetta
      { recipeId: allRecipes[1].id, chapterId: chapter1.id, order: 2 }, // Caprese
      { recipeId: allRecipes[2].id, chapterId: chapter1.id, order: 3 }, // Hummus
      // Hovedretter (3 recipes)  
      { recipeId: allRecipes[3].id, chapterId: chapter2.id, order: 1 }, // Carbonara
      { recipeId: allRecipes[4].id, chapterId: chapter2.id, order: 2 }, // Risotto
      { recipeId: allRecipes[5].id, chapterId: chapter2.id, order: 3 }, // Laks
      // Desserter (1 recipe)
      { recipeId: allRecipes[6].id, chapterId: chapter3.id, order: 1 }, // Tiramisu
    ]);

    console.log('🔗 Linked recipes to chapters');
  });

  console.log('✅ Seeding complete!');

  process.exit(0);
}

seed().catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});