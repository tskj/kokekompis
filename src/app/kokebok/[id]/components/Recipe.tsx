import { RecipeContent } from '@/lib/db/schema';

interface RecipeProps {
  title: string;
  description?: string | null;
  content: RecipeContent;
}

export function Recipe({ title, description, content }: RecipeProps) {
  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{title}</h1>
        {description && (
          <p className="text-lg text-gray-600">{description}</p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Ingredients */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Ingredienser</h2>
          <ul className="space-y-2">
            {content.ingredients.map((ingredient, index) => (
              <li key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="font-medium">{ingredient.name}</span>
                <span className="text-gray-600">
                  {ingredient.amount}{ingredient.unit ? ` ${ingredient.unit}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Instructions */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Fremgangsmåte</h2>
          <ol className="space-y-3">
            {content.instructions
              .sort((a, b) => a.step - b.step)
              .map((instruction) => (
                <li key={instruction.step} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white text-sm font-medium rounded-full flex items-center justify-center">
                    {instruction.step}
                  </span>
                  <p className="text-gray-700">{instruction.instruction}</p>
                </li>
              ))}
          </ol>
        </div>
      </div>

      {/* Recipe metadata */}
      {(content.cookingTime || content.servings) && (
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <div className="flex gap-6 text-sm text-gray-600">
            {content.cookingTime && (
              <div className="flex items-center gap-1">
                <span className="font-medium">Tilberedningstid:</span>
                <span>{content.cookingTime} min</span>
              </div>
            )}
            {content.servings && (
              <div className="flex items-center gap-1">
                <span className="font-medium">Porsjoner:</span>
                <span>{content.servings}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
