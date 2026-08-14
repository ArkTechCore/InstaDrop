import { AppError } from "./types";

const MAX_REQUESTS_PER_MINUTE = 20;
const RATE_WINDOW_MS = 60_000;

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

const ALLOWED_MEDIA_HOST_SUFFIXES = [
  ".cdninstagram.com",
  ".fbcdn.net",
  ".cdninstagram.net"
];

const ALLOWED_MEDIA_HOSTS = new Set([
  "cdninstagram.com",
  "fbcdn.net",
  "scontent.cdninstagram.com"
]);

export function assertRateLimit(request: Request): void {
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "local";
  const now = Date.now();
  const bucket = buckets.get(ip);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return;
  }

  bucket.count += 1;
  if (bucket.count > MAX_REQUESTS_PER_MINUTE) {
    throw new AppError(
      "RATE_LIMITED",
      "Too many requests. Please try again shortly.",
      429
    );
  }
}

export function validateDownloadTarget(input: string): string {
  if (!input || input.length > 4096) {
    throw new AppError("INVALID_URL", "Invalid download URL.", 400);
  }

  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new AppError("INVALID_URL", "Invalid download URL.", 400);
  }

  if (parsed.protocol !== "https:") {
    throw new AppError("INVALID_URL", "Only HTTPS media URLs can be downloaded.", 400);
  }

  const hostname = parsed.hostname.toLowerCase();
  if (isBlockedHost(hostname) || !isAllowedMediaHost(hostname)) {
    throw new AppError("INVALID_URL", "This media host is not supported.", 400);
  }

  return parsed.toString();
}

export function isAllowedMediaHost(hostname: string): boolean {
  return (
    ALLOWED_MEDIA_HOSTS.has(hostname) ||
    ALLOWED_MEDIA_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  );
}

export function isBlockedHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "");

  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "0000:0000:0000:0000:0000:0000:0000:0001"
  ) {
    return true;
  }

  if (isPrivateIpv4(host)) {
    return true;
  }

  return (
    host.startsWith("10.") ||
    host.startsWith("127.") ||
    host.startsWith("169.254.") ||
    host.startsWith("172.16.") ||
    host.startsWith("172.17.") ||
    host.startsWith("172.18.") ||
    host.startsWith("172.19.") ||
    host.startsWith("172.20.") ||
    host.startsWith("172.21.") ||
    host.startsWith("172.22.") ||
    host.startsWith("172.23.") ||
    host.startsWith("172.24.") ||
    host.startsWith("172.25.") ||
    host.startsWith("172.26.") ||
    host.startsWith("172.27.") ||
    host.startsWith("172.28.") ||
    host.startsWith("172.29.") ||
    host.startsWith("172.30.") ||
    host.startsWith("172.31.") ||
    host.startsWith("192.168.")
  );
}

function isPrivateIpv4(host: string): boolean {
  const parts = host.split(".");
  if (parts.length !== 4) {
    return false;
  }

  const nums = parts.map((part) => Number(part));
  if (nums.some((num) => !Number.isInteger(num) || num < 0 || num > 255)) {
    return false;
  }

  const [a, b] = nums;
  return (
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    a === 0
  );
}

export function jsonSecurityHeaders(): HeadersInit {
  return {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer"
  };
}
