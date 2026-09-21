// The monorepo lints itself with the same config it publishes for the apps (see
// packages/config/eslint.js). Type-aware rules cover every package's src/ and tests/, since each
// package's tsconfig.json includes both.
import { createEslintConfig } from "./packages/config/eslint.js";

export default createEslintConfig({
  tsconfigRootDir: import.meta.dirname,
  typeAwareFiles: ["packages/*/src/**/*.ts", "packages/*/tests/**/*.ts", "packages/*/stories/**/*.ts"],
  ignores: [".changeset/"],
});
