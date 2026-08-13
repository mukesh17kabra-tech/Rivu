import type { NextRequest } from "next/server";

/**
 * The app's own public origin, with no trailing slash.
 *
 * Prefers the configured HOST so it stays correct behind Vercel's proxy
 * (which rewrites the Host header on preview/alias domains), and falls back
 * to the incoming request's origin so a missing env var can never produce a
 * URL like "undefined/api/auth/callback".
 */
export function appUrl(req?: NextRequest): string {
  const configured = process.env.HOST || process.env.SHOPIFY_APP_URL;
  if (configured) return configured.replace(/\/+$/, "");

  if (req) return req.nextUrl.origin;

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;

  return "";
}

/** True when `candidate` is an absolute URL on our own origin. */
export function isSameOrigin(candidate: string, req?: NextRequest): boolean {
  try {
    const base = appUrl(req);
    if (!base) return false;
    return new URL(candidate).origin === new URL(base).origin;
  } catch {
    return false;
  }
}
