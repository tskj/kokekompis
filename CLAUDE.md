# AI Assistant Context

This is a Next.js project using a "code-first" database approach with Drizzle ORM and PostgreSQL.

- **Package Manager:** pnpm
- **Key Library:** Drizzle ORM for database interaction. Schema is defined in TypeScript at `src/lib/db/schema.ts`.
- **Migrations:** This project does NOT use a direct push-to-db command. It uses a production-safe workflow. Changes are made by generating SQL migration files.
- **Primary Instruction Source:** The development workflow, especially for database changes, is documented in `README.md`. Always check that file for instructions on how to handle database migrations.

## Commit Style
- Use lowercase, casual style
- Keep messages short and concise
- Focus on why the change was made rather than what changed (since that's in the diff)
- Example: "add auth to prepare for user features" instead of "Add NextAuth.js configuration with Google provider"

## Development Preferences
- **Language**: Use Norwegian for UI text, variable names, and URL parameters (e.g., `?oppskrift=` instead of `?recipe=`)
- **Server Components**: Prefer server components over client components unless interactivity is needed
- **URL State**: Use URL parameters for state management instead of client-side state when possible
- **Native HTML**: Use native HTML elements like `<details>` for expandable content instead of custom JavaScript
- **Type Safety**: Prefer TypeScript type inference from database schemas over manual type definitions
- **Simplicity**: Avoid over-engineering - choose simple solutions over complex ones
- **User ID**: `00091a95-ec3b-4119-b1cf-736bb7b02b9c` for testing and seeding data

## Code Style
- **Early returns**: Use one-line brace-free style for early returns and guard clauses
  ```typescript
  // Preferred
  if (!isValid) throw new Error('Invalid input');
  if (!data) return null;
  if (user.role !== 'admin') notFound();
  
  // Avoid
  if (!isValid) {
    throw new Error('Invalid input');
  }
  ```
- **Guard clause spacing**: When a guard clause directly validates the line above, no empty line between them
  ```typescript
  // Preferred - guard clause belongs to the line above
  const id = parseUuidParam(param);
  if (!id) notFound();
  
  const data = await fetchData();
  if (!data) return null;
  
  // Also preferred - guard clause is more independent
  const user = getCurrentUser();
  
  if (user.role !== 'admin') notFound();
  ```
- **No trailing whitespace**: Never insert whitespace at end of lines, including empty lines
  ```typescript
  // WRONG - empty lines with spaces/tabs (shown as · for visibility)
  export function example() {
    let result = '';
  ··
    for (let i = 0; i < 10; i++) {
      result += i;
  ····
      if (i > 5) break;
    }
  ··
    return result;
  }
  
  // CORRECT - completely empty lines
  export function example() {
    let result = '';

    for (let i = 0; i < 10; i++) {
      result += i;

      if (i > 5) break;
    }

    return result;
  }
  ```

## Database Notes
- Uses regular `jsonb` columns for now instead of custom validated types (can be improved later)
- Zod schemas are exported from schema file for component usage and runtime validation
- Seeds data with Norwegian content for testing

## Important: User can't see tool results
When the user asks to "show me" file contents, they literally cannot see the results of Read tool calls. Always include the actual file contents in my text response, not just a description of what I found.
