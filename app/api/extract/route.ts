import { extractInstagramMedia } from "@/lib/instagram";
import { assertRateLimit, jsonSecurityHeaders } from "@/lib/security";
import { AppError, type ExtractResponseBody } from "@/lib/types";
import { validateInstagramUrl } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    assertRateLimit(request);

    const body = (await request.json()) as unknown;
    const url = readUrl(body);
    const { normalizedUrl } = validateInstagramUrl(url);
    const post = await extractInstagramMedia(normalizedUrl);

    const response: ExtractResponseBody = {
      success: true,
      post
    };

    return Response.json(response, {
      status: 200,
      headers: jsonSecurityHeaders()
    });
  } catch (error) {
    return errorResponse(error);
  }
}

function readUrl(body: unknown): string {
  if (!body || typeof body !== "object" || !("url" in body)) {
    throw new AppError(
      "INVALID_URL",
      "Please enter a valid Instagram post or Reel URL.",
      400
    );
  }

  const url = (body as { url: unknown }).url;
  if (typeof url !== "string") {
    throw new AppError(
      "INVALID_URL",
      "Please enter a valid Instagram post or Reel URL.",
      400
    );
  }

  return url;
}

function errorResponse(error: unknown): Response {
  const appError =
    error instanceof AppError
      ? error
      : new AppError("UNEXPECTED", "Something went wrong. Please try again.", 500);

  const response: ExtractResponseBody = {
    success: false,
    error: {
      code: appError.code,
      message: appError.message
    }
  };

  return Response.json(response, {
    status: appError.status,
    headers: jsonSecurityHeaders()
  });
}
