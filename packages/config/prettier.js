// The Prettier settings the apps share. printWidth is the 120 two of the three use; clip-extractor
// runs at 140 and overrides it with `{ ...config, printWidth: 140 }` until its files are rewrapped.
/** @type {import("prettier").Config} */
const config = {
  arrowParens: "always",
  bracketSameLine: false,
  bracketSpacing: true,
  embeddedLanguageFormatting: "auto",
  endOfLine: "lf",
  htmlWhitespaceSensitivity: "css",
  printWidth: 120,
  quoteProps: "as-needed",
  semi: true,
  singleQuote: false,
  tabWidth: 2,
  trailingComma: "all",
  useTabs: false,
};

export default config;
