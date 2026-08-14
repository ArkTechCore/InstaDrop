import { jsonSecurityHeaders, validateDownloadTarget } from "@/lib/security";
import { AppError, type ApiErrorBody } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_DOWNLOAD_BYTES = 100 * 1024 * 1024;
const MAX_REDIRECTS = 3;

export async function GET(request: Request): Promise<Response> {
  let safeUrl: string | null = null;

  try {
    const { searchParams } = new URL(request.url);
    const target = searchParams.get("url");

    if (!target) {
      throw new AppError("INVALID_URL", "Invalid download URL.", 400);
    }

    safeUrl = validateDownloadTarget(target);
    const upstream = await fetchMedia(safeUrl);
    const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
    const contentLength = upstream.headers.get("content-length");

    if (!isAllowedContentType(contentType)) {
      throw new AppError("INVALID_URL", "This media type is not supported.", 400);
    }

    if (contentLength && Number(contentLength) > MAX_DOWNLOAD_BYTES) {
      throw new AppError("INVALID_URL", "This media file is too large to download here.", 400);
    }

    const headers = new Headers({
      "cache-control": "no-store",
      "content-type": contentType,
      "content-disposition": `attachment; filename="${filenameFor(safeUrl, contentType)}"`,
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff"
    });

    if (contentLength) {
      headers.set("content-length", contentLength);
    }

    return new Response(upstream.body, {
      status: 200,
      headers
    });
  } catch (error) {
    if (
      safeUrl &&
      error instanceof AppError &&
      error.code === "EXTRACTION_FAILED"
    ) {
      return redirectToSource(safeUrl);
    }

    const appError =
      error instanceof AppError
        ? error
        : new AppError("UNEXPECTED", "Something went wrong. Please try again.", 500);
    const body: ApiErrorBody = {
      success: false,
      error: {
        code: appError.code,
        message: appError.message
      }
    };

    return Response.json(body, {
      status: appError.status,
      headers: jsonSecurityHeaders()
    });
  }
}

function redirectToSource(url: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      location: url,
      "cache-control": "no-store",
      "referrer-policy": "no-referrer"
    }
  });
}

async function fetchMedia(url: string): Promise<Response> {
  let current = url;

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const response = await fetch(current, {
      redirect: "manual",
      headers: {
        accept: "image/*,video/*,application/octet-stream",
        "user-agent": "InstaDrop/1.0"
      }
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new AppError("EXTRACTION_FAILED", "The media download redirected incorrectly.", 502);
      }
      current = validateDownloadTarget(new URL(location, current).toString());
      continue;
    }

    if (!response.ok || !response.body) {
      throw new AppError("EXTRACTION_FAILED", "The media file could not be downloaded.", 502);
    }

    return response;
  }

  throw new AppError("EXTRACTION_FAILED", "The media download redirected too many times.", 502);
}

function isAllowedContentType(contentType: string): boolean {
  const normalized = contentType.toLowerCase();
  return (
    normalized.startsWith("image/") ||
    normalized.startsWith("video/") ||
    normalized.startsWith("application/octet-stream")
  );
}

function filenameFor(url: string, contentType: string): string {
  const extensionFromPath = new URL(url).pathname.split(".").pop()?.toLowerCase();
  const extension =
    extensionFromPath && /^[a-z0-9]{2,5}$/.test(extensionFromPath)
      ? extensionFromPath
      : contentType.startsWith("video/")
        ? "mp4"
        : "jpg";

  return `instadrop-${Date.now()}.${extension}`;
}
