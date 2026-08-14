import { AppError, type ValidationResult } from "./types";

export const MAX_URL_LENGTH = 2048;

const ALLOWED_HOSTS = new Set([
  "instagram.com",
  "www.instagram.com",
  "m.instagram.com"
]);

const SUPPORTED_PATH = /^\/(p|reel|reels)\/([A-Za-z0-9_-]{5,})\/?$/;

export function validateInstagramUrl(input: string): ValidationResult {
  const trimmed = input.trim();

  if (!trimmed || trimmed.length > MAX_URL_LENGTH) {
    throw new AppError(
      "INVALID_URL",
      "Please enter a valid Instagram post or Reel URL.",
      400
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new AppError(
      "INVALID_URL",
      "Please enter a valid Instagram post or Reel URL.",
      400
    );
  }

  if (parsed.protocol !== "https:") {
    throw new AppError(
      "INVALID_URL",
      "Only secure Instagram links are supported.",
      400
    );
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(hostname)) {
    throw new AppError(
      "INVALID_URL",
      "Please enter a valid Instagram post or Reel URL.",
      400
    );
  }

  const match = parsed.pathname.match(SUPPORTED_PATH);
  if (!match) {
    throw new AppError(
      "UNSUPPORTED_URL",
      "This Instagram URL type isn't supported yet.",
      400
    );
  }

  const kind = match[1] as "p" | "reel" | "reels";
  const shortcode = match[2];
  const normalized = new URL(`/${kind}/${shortcode}/`, "https://www.instagram.com");

  return {
    normalizedUrl: normalized.toString(),
    shortcode,
    kind
  };
}
