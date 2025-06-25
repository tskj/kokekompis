import { RecipeContent } from '@/lib/db/schema';

interface RecipeProps {
  title: string;
  description?: string | null;
  content: RecipeContent;
}

export function Recipe({ title, description, content }: RecipeProps) {
  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{title}</h1>
        {description && (
          <p className="text-lg text-gray-600">{description}</p>
        )}
      </div>

      {/* Recipe Info Bar */}
      <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-800 dark:text-gray-200">
          <div className="flex items-center gap-1">
            <span className="font-medium">Tilberedning:</span>
            <span>{content.bar.tilberedingstid_minutter} min</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-medium">Porsjoner:</span>
            <span>{content.bar.antall_porsjoner}</span>
          </div>
          {content.bar.stekeinfo && (
            <div className="flex items-center gap-1">
              <span className="font-medium">Ovn:</span>
              <span>{content.bar.stekeinfo.grader_celsius}°C i {content.bar.stekeinfo.steketid_minutter} min</span>
            </div>
          )}
          {content.bar.venteinfo && (
            <div className="flex items-center gap-1">
              <span className="font-medium">
                {content.bar.venteinfo.type === "kjøl" ? "Kjøl:" : "Frys:"}
              </span>
              <span>{content.bar.venteinfo.timer} timer</span>
            </div>
          )}
        </div>
      </div>

      {/* Ingredients */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Ingredienser</h2>
        {content.ingredients.type === "simple" ? (
          <ul className="space-y-2">
            {content.ingredients.items.map((ingredient, index) => (
              <li key={index} className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-gray-700 dark:text-gray-300">{ingredient.value}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="space-y-6">
            {content.ingredients.sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3 text-blue-600 dark:text-blue-400">{section.sectionName}</h3>
                <ul className="space-y-2">
                  {section.items.map((ingredient, index) => (
                    <li key={index} className="flex items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <span className="text-gray-700 dark:text-gray-300">{ingredient.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fremgangsmåte */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Fremgangsmåte</h2>
        {content.ingredients.type === "simple" ? (
          <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{content.ingredients.fremgangsmåte}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {content.ingredients.sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
                <h3 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">{section.sectionName}</h3>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{section.fremgangsmåte}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Final Product */}
      <div className="p-6 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
        <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-gray-100">Ferdig produkt</h2>
        {content.ferdigprodukt.bilder.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            {content.ferdigprodukt.bilder.map((bilde, index) => (
              <img
                key={index}
                src={bilde}
                alt={`${title} bilde ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg"
              />
            ))}
          </div>
        )}
        {content.ferdigprodukt.tekst && (
          <p className="text-gray-700 dark:text-gray-300 italic">{content.ferdigprodukt.tekst}</p>
        )}
      </div>
    </div>
  );
}
