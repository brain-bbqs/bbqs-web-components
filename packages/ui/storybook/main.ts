import { createStorybookMain } from "@brain-bbqs/config/storybook";
import { workspaceAliases } from "../../../tooling/aliases.js";

export default createStorybookMain({
  packageJson: new URL("../package.json", import.meta.url),
  stories: ["../stories/**/*.stories.@(ts|js)"],
  viteFinal(config) {
    // The stories import this package's own source through its bare name, like an app would.
    config.resolve = {
      ...config.resolve,
      alias: [...((config.resolve?.alias as [] | undefined) ?? []), ...workspaceAliases],
    };
    return config;
  },
});
