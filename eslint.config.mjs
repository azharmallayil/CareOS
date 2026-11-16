// @ts-check
import { createRequire } from "node:module";
import tseslint from "typescript-eslint";
import globals from "globals";

const require = createRequire(import.meta.url);
const eslintRequire = createRequire(require.resolve("eslint"));
const eslint = eslintRequire("@eslint/js");

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      // --- Cross-boundary import guard ---
      // apps/web must not import from apps/api or apps/worker
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["*/apps/api/*", "*/apps/worker/*"],
              message:
                "apps/web must not import from apps/api or apps/worker. Call the API over HTTP.",
            },
          ],
        },
      ],

      // General quality rules
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.storybook/**",
      "**/coverage/**",
      "supabase/functions/**",
      "scripts/**",
    ],
  }
);
