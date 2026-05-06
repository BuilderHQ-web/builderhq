import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Module discipline rules.
 *
 * The codebase is a modular monolith. Each module under `src/modules/<m>`
 * exposes its public API via `index.ts`. Outsiders MUST import from
 * `@/modules/<m>` — never reach into a module's internals (schema,
 * service, policies, types).
 *
 * Inside a module, use relative imports (./service, ./schema, ...).
 * That way these no-restricted-imports patterns only block cross-module
 * deep imports, not intra-module ones.
 */
/**
 * Override: src/lib/db.ts is allowed to import module schemas directly via
 * `@/modules/<m>/schema`. It's the only consumer of those internals — Drizzle
 * needs the table objects at adapter setup time. Going through the module
 * index instead creates a circular import (db → module/index → service → db).
 */
const dbSchemaImportException = {
  files: ["src/lib/db.ts"],
  rules: { "no-restricted-imports": "off" },
};

const moduleDisciplineRule = {
  files: ["src/**/*.{ts,tsx}"],
  ignores: ["src/lib/db.ts"],
  rules: {
    // Underscore-prefixed args are intentional placeholders (e.g. middleware
    // params reserved for Phase 1). Don't flag them.
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: [
              "@/modules/*/schema",
              "@/modules/*/schema/*",
              "@/modules/*/service",
              "@/modules/*/service/*",
              "@/modules/*/policies",
              "@/modules/*/policies/*",
              "@/modules/*/events",
              "@/modules/*/events/*",
            ],
            message:
              "Import a module's public API from `@/modules/<m>` (its index.ts). Internals (schema/service/policies/events) are private — extend the module's index instead.",
          },
        ],
      },
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  moduleDisciplineRule,
  dbSchemaImportException,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Reference HTML — ground-truth, not source code
    "reference/**",
  ]),
]);

export default eslintConfig;
