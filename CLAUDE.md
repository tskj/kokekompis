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