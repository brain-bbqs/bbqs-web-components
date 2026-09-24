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
