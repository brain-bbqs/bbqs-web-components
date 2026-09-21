import { fileURLToPath } from "node:url";

/**
 * Vite/Vitest aliases pointing each @brain-bbqs/* import at its sibling package's TypeScript
 * source, the runtime twin of the `paths` in tsconfig.base.json. Used by every package's
 * vitest.config.ts (and the ui package's Storybook) so nothing here has to be built before it can
 * be tested. The published packages resolve through node_modules and never see these.
 */
const here = (rel: string): string => fileURLToPath(new URL(rel, import.meta.url));

export const workspaceAliases = [
  { find: "@brain-bbqs/utils", replacement: here("../packages/utils/src/index.ts") },
  { find: "@brain-bbqs/ember-client", replacement: here("../packages/ember-client/src/index.ts") },
  { find: "@brain-bbqs/ui", replacement: here("../packages/ui/src/index.ts") },
  { find: "@brain-bbqs/test-utils/playwright", replacement: here("../packages/test-utils/src/playwright/index.ts") },
  { find: "@brain-bbqs/test-utils/vitest", replacement: here("../packages/test-utils/src/vitest/index.ts") },
];
