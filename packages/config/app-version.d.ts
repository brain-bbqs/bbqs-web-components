export declare const CHROMATIC_PLACEHOLDER_VERSION: "0.0.0";

/** The version an app stamps into its footer, read from its package.json unless
 * `CHROMATIC_STATIC_VERSION` pins it to the placeholder. */
export declare function resolveAppVersion(packageJsonUrl: string | URL, env?: NodeJS.ProcessEnv): string;
