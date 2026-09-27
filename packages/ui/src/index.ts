export { required, optional, getShellElements, type ShellElementIds, type ShellElements } from "./elements.js";
export { h, button, svgEl, svgText, escapeHtml, copyToClipboard, writeClipboard } from "./dom.js";
export { moonIcon, sunIcon, signOutIcon, resetIcon, chevronIcon } from "./icons.js";
export {
  THEMES,
  createThemeStore,
  currentTheme,
  applyTheme,
  initThemeToggle,
  type Theme,
  type ThemeToggle,
  type ThemeToggleOptions,
} from "./theme.js";
export {
  renderAuthState,
  renderIdentity,
  refreshIdentity,
  bindAccountMenu,
  type AccountElements,
  type AccountUser,
  type AccountMenuHandlers,
} from "./account.js";
export { renderVersion } from "./version.js";
export {
  createHumanSubjectsGate,
  type HumanSubjectsElements,
  type HumanSubjectsGate,
  type HumanSubjectsState,
} from "./humanSubjectsGate.js";
export { bindDropzone, showDropzoneReject, type DropzoneHandlers, type DropzoneBinding } from "./dropzone.js";
export {
  buildThemeToggle,
  buildAccountMenu,
  buildBrandWatermark,
  buildPageFooter,
  buildHumanSubjectsBanner,
  buildDropzone,
  type AccountMenuOptions,
  type BrandWatermarkOptions,
  type PageFooterOptions,
  type FooterBrand,
  type HumanSubjectsBannerOptions,
  type DropzoneOptions,
} from "./shell.js";
