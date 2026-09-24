/**
 * The footer's version stamp, "v1.2.3", filled from the build-time `__APP_VERSION__` define so the
 * running page always names the package.json version it was built from. The anchor itself already
 * points at the source repository.
 */
export function renderVersion(anchor: HTMLElement, version: string): void {
  anchor.textContent = `v${version}`;
}
