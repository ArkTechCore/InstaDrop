import { jsonSecurityHeaders, validateDownloadTarget } from "@/lib/security";
import { AppError, type ApiErrorBody } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const target = searchParams.get("url");

    if (!target) {
      throw new AppError("INVALID_URL", "Invalid download URL.", 400);
    }

    return redirectToSource(validateDownloadTarget(target));
  } catch (error) {
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
