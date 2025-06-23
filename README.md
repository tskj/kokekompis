# Kokekompis.no - Next.js Boilerplate

This project is a minimal, production-ready boilerplate for a Next.js application.

## Tech Stack

- **Package Manager:** pnpm
- **Framework:** Next.js with App Router
- **Styling:** Tailwind CSS
- **ORM:** Drizzle ORM
- **Database:** PostgreSQL
- **Authentication:** Auth.js (Google Provider)
- **Deployment:** Railway

## Environment Setup

1.  Copy the `.env.example` file to a new file named `.env`.
2.  Fill in the required values:
    - `DATABASE_URL`: Your PostgreSQL connection string (from Railway).
    - `NEXTAUTH_SECRET`: A strong secret string (`openssl rand -hex 32`).
    - `NEXTAUTH_URL`: `https://www.kokekompis.no` for production, `http://localhost:3000` for local dev.
    - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: Credentials from Google Cloud Console.

## Development Workflow

The project uses a production-safe migration strategy. Migrations are generated locally and run automatically on deployment by Railway.

**To make a database schema change:**

1.  Modify the schema in `src/lib/db/schema.ts`.
2.  Run the following command in your terminal to generate a new SQL migration file:
    ```bash
    pnpm db:generate
    ```
3.  A new SQL file will be created in the `/drizzle` directory. Review this file to ensure the changes are correct.
4.  Commit your code changes **and the new migration file** to Git.
5.  Push your commit. Railway will automatically build the project and run the new migration as part of its release phase.
