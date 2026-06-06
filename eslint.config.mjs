import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Ban `.limit(1)` on Drizzle queries — it silently hides a uniqueness bug. Express the intended
    // cardinality with the cardinality.ts helpers instead: `.single(ctx)` / `.maybeSingle(ctx)` when
    // ≤1 row is an invariant (a 2nd row fails loudly), `.exists()` when you only care whether any
    // row matches, or `.first(ctx)` / `.maybeFirst(ctx)` for a deliberate top-of-many pick (pair
    // with `.orderBy`). See src/lib/cardinality.ts. `.limit(n)` for any other n is fine.
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name='limit'][arguments.0.value=1]",
          message:
            "Don't use .limit(1) — it hides duplicate-row bugs. Use .single(ctx)/.maybeSingle(ctx) (≤1 invariant), .exists() (presence), or .first(ctx)/.maybeFirst(ctx) (top-of-many, with .orderBy). See src/lib/cardinality.ts.",
        },
      ],
    },
  },
];

export default eslintConfig;
