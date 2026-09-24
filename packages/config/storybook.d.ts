import type { StorybookConfig } from "@storybook/html-vite";
import type { InlineConfig } from "vite";

export interface StorybookMainOptions {
  /** The package.json `__APP_VERSION__` is read from. */
  packageJson: string | URL;
  /** Story globs, relative to the config dir. */
  stories?: string[];
  /** Static asset mounts. */
  staticDirs?: StorybookConfig["staticDirs"];
  /** Further Vite tweaks, applied after the version define. */
  viteFinal?: (config: InlineConfig) => InlineConfig | Promise<InlineConfig>;
}

export declare function createStorybookMain(options: StorybookMainOptions): StorybookConfig;

export interface StorybookPreview {
  parameters: { backgrounds: { disable: boolean } };
  globalTypes: {
    theme: {
      description: string;
      toolbar: {
        title: string;
        icon: string;
        items: { value: string; title: string }[];
        dynamicTitle: boolean;
      };
    };
  };
  initialGlobals: { theme: string };
  decorators: ((story: () => HTMLElement, context: { globals: { theme?: string } }) => HTMLElement)[];
}

export declare const storybookPreview: StorybookPreview;
