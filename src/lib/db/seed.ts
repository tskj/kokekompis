import { db } from '@/lib/db';
import { cookbook, chapters, recipes, recipeChapters } from '@/lib/db/schema';

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

    // Create all recipes with new schema
    const allRecipes = await tx
      .insert(recipes)
      .values([
        // Forretter
        {
          userId: USER_ID,
          title: 'Bruschetta med Tomat',
          description: 'Klassisk italiensk forrett med ferske tomater',
          content: {
            bar: {
              tilberedingstid_minutter: 15,
              antall_porsjoner: 4,
              stekeinfo: null,
              venteinfo: null,
            },
            ingredients: {
              type: "simple",
              items: [
                { type: "fritekst", value: "4 skiver brød" },
                { type: "fritekst", value: "3 store tomater" },
                { type: "fritekst", value: "2 hvitløksfedd" },
                { type: "fritekst", value: "1 bunt fersk basilikum" },
                { type: "fritekst", value: "3 ss olivenolje" },
                { type: "fritekst", value: "Salt og pepper" },
              ],
              fremgangsmåte: "Rist brødskivene til de er gylne. Skjær tomater i små terninger og bland med hakket hvitløk og basilikum. Drypp over olivenolje og krydre med salt og pepper. Legg tomatblandingen på brødskivene og server umiddelbart.",
            },
            ferdigprodukt: {
              bilder: [],
              tekst: "Serveres best mens brødet fortsatt er varmt og sprøtt.",
            },
          },
        },
        {
          userId: USER_ID,
          title: 'Hjemmelaget Pizza',
          description: 'Crispy pizza med hjemmelaget bunn og friske toppinger',
          content: {
            bar: {
              tilberedingstid_minutter: 90,
              antall_porsjoner: 4,
              stekeinfo: {
                grader_celsius: 250,
                steketid_minutter: 12,
              },
              venteinfo: {
                type: "kjøl",
                timer: 1,
              },
            },
            ingredients: {
              type: "sectioned",
              sections: [
                {
                  sectionName: "Pizzabunn",
                  items: [
                    { type: "fritekst", value: "500g hvetemel" },
                    { type: "fritekst", value: "3dl lunken vann" },
                    { type: "fritekst", value: "1 ts tørrgjær" },
                    { type: "fritekst", value: "1 ts salt" },
                    { type: "fritekst", value: "2 ss olivenolje" },
                  ],
                  fremgangsmåte: "Løs opp gjæren i det lunkne vannet. Bland mel og salt, tilsett gjærblandingen og olivenolje. Elt deigen til den er smidig, ca 10 minutter. La heve i 1 time.",
                },
                {
                  sectionName: "Toppings",
                  items: [
                    { type: "fritekst", value: "2dl tomatsaus" },
                    { type: "fritekst", value: "200g mozzarella" },
                    { type: "fritekst", value: "100g skinke eller pepperoni" },
                    { type: "fritekst", value: "1 paprika" },
                    { type: "fritekst", value: "100g sjampinjong" },
                    { type: "fritekst", value: "Fersk basilikum" },
                  ],
                  fremgangsmåte: "Skjær grønnsakene i tynne skiver. Riv osten. Brett ut deigen på pizzastein eller stekebrett, smør på tomatsaus og fordel toppings. Stek i 250°C i 10-12 minutter til bunnen er gyllen.",
                },
              ],
            },
            ferdigprodukt: {
              bilder: [],
              tekst: "Pizza smaker best når den spises rett fra ovnen mens osten fortsatt bobler.",
            },
          },
        },
        {
          userId: USER_ID,
          title: 'Kylling Tikka Masala',
          description: 'Krydret indisk kyllingrett i kremet tomatsaus',
          content: {
            bar: {
              tilberedingstid_minutter: 45,
              antall_porsjoner: 6,
              stekeinfo: null,
              venteinfo: {
                type: "kjøl",
                timer: 2,
              },
            },
            ingredients: {
              type: "sectioned",
              sections: [
                {
                  sectionName: "Marinert kylling",
                  items: [
                    { type: "fritekst", value: "800g kyllingfilet" },
                    { type: "fritekst", value: "2dl gresk yoghurt" },
                    { type: "fritekst", value: "2 ss tandoori masala" },
                    { type: "fritekst", value: "1 ss ingefær, revet" },
                    { type: "fritekst", value: "3 hvitløksfedd" },
                  ],
                  fremgangsmåte: "Skjær kyllingen i biter og mariner i yoghurt blandet med krydder, ingefær og hvitløk. La stå i kjøleskapet i minst 2 timer.",
                },
                {
                  sectionName: "Masala saus",
                  items: [
                    { type: "fritekst", value: "1 stor løk" },
                    { type: "fritekst", value: "400g hermetiske tomater" },
                    { type: "fritekst", value: "2dl kokosmelk" },
                    { type: "fritekst", value: "2 ss garam masala" },
                    { type: "fritekst", value: "1 ss paprika" },
                    { type: "fritekst", value: "1 ts spisskummen" },
                    { type: "fritekst", value: "Salt og pepper" },
                  ],
                  fremgangsmåte: "Stek den marinerte kyllingen til den er gjennomstekt. Stek hakket løk til myk, tilsett krydder og tomater. Kok i 10 minutter, tilsett kokosmelk og kylling. Simmer i 5 minutter til sausen tykner.",
                },
              ],
            },
            ferdigprodukt: {
              bilder: [],
              tekst: "Serveres med basmatiris og naan-brød. Garnér med fersk koriander.",
            },
          },
        },
        // Hovedretter
        {
          userId: USER_ID,
          title: 'Bakt Laks med Gressløksaus',
          description: 'Saftig ovnsbakt laks med kremet gressløksaus',
          content: {
            bar: {
              tilberedingstid_minutter: 25,
              antall_porsjoner: 4,
              stekeinfo: {
                grader_celsius: 200,
                steketid_minutter: 15,
              },
              venteinfo: null,
            },
            ingredients: {
              type: "simple",
              items: [
                { type: "fritekst", value: "600g laksfilet" },
                { type: "fritekst", value: "2dl rømme" },
                { type: "fritekst", value: "1 bunt gressløk" },
                { type: "fritekst", value: "1 sitron" },
                { type: "fritekst", value: "2 ss smør" },
                { type: "fritekst", value: "Salt og hvit pepper" },
              ],
              fremgangsmåte: "Krydre laksen med salt og pepper. Legg på smurt stekebrett og stek i 200°C i 12-15 minutter. Bland rømme med hakket gressløk og sitronsaft. Server laksen med sausen og kokte poteter eller ris.",
            },
            ferdigprodukt: {
              bilder: [],
              tekst: "Laksen er ferdig når den flaker seg lett med en gaffel.",
            },
          },
        },
        // Desserter
        {
          userId: USER_ID,
          title: 'Sjokoladefondant',
          description: 'Varm sjokoladekake med flytende kjerne',
          content: {
            bar: {
              tilberedingstid_minutter: 30,
              antall_porsjoner: 4,
              stekeinfo: {
                grader_celsius: 220,
                steketid_minutter: 12,
              },
              venteinfo: {
                type: "frys",
                timer: 2,
              },
            },
            ingredients: {
              type: "simple",
              items: [
                { type: "fritekst", value: "100g mørk sjokolade (70%)" },
                { type: "fritekst", value: "100g smør" },
                { type: "fritekst", value: "2 hele egg" },
                { type: "fritekst", value: "2 eggeplommer" },
                { type: "fritekst", value: "60g sukker" },
                { type: "fritekst", value: "30g hvetemel" },
                { type: "fritekst", value: "Smør til former" },
              ],
              fremgangsmåte: "Smelt sjokolade og smør sammen. Visp egg, eggeplommer og sukker luftig. Rør inn sjokoladeblandingen og mel. Fordel i smurte former og sett i fryseren i 2 timer. Stek fra fryst i 220°C i 10-12 minutter til kantene er faste men midten fortsatt myk.",
            },
            ferdigprodukt: {
              bilder: [],
              tekst: "Serveres umiddelbart med vaniljeis eller pisket krem. Kaken skal ha flytende kjerne.",
            },
          },
        },
      ])
      .returning();

    console.log('🍳 Created recipes:', allRecipes.map(r => r.title));

    // Link recipes to chapters with proper ordering
    await tx.insert(recipeChapters).values([
      // Forretter (3 recipes)
      { recipeId: allRecipes[0].id, chapterId: chapter1.id, order: 1 }, // Bruschetta
      { recipeId: allRecipes[1].id, chapterId: chapter1.id, order: 2 }, // Pizza
      { recipeId: allRecipes[2].id, chapterId: chapter1.id, order: 3 }, // Tikka Masala
      // Hovedretter (1 recipe)  
      { recipeId: allRecipes[3].id, chapterId: chapter2.id, order: 1 }, // Laks
      // Desserter (1 recipe)
      { recipeId: allRecipes[4].id, chapterId: chapter3.id, order: 1 }, // Fondant
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