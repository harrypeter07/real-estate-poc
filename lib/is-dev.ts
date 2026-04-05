/** True only in local `next dev` — hide test-only UI in production builds. */
export const isDev = process.env.NODE_ENV === "development";
