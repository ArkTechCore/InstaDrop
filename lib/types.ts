export type MediaType = "image" | "video";
export type InstagramPostType = "image" | "video" | "carousel";

export interface InstagramMediaItem {
  id: string;
  type: MediaType;
  url: string;
  thumbnail?: string;
  width?: number;
  height?: number;
}

export interface InstagramPost {
  type: InstagramPostType;
  shortcode?: string;
  caption?: string | null;
  thumbnail?: string;
  items: InstagramMediaItem[];
}

export interface ValidationResult {
  normalizedUrl: string;
  shortcode: string;
  kind: "p" | "reel" | "reels";
}

export type ApiErrorCode =
  | "INVALID_URL"
  | "UNSUPPORTED_URL"
  | "RATE_LIMITED"
  | "NOT_FOUND"
  | "PRIVATE_OR_UNAVAILABLE"
  | "EXTRACTION_FAILED"
  | "UPSTREAM_BLOCKED"
  | "TIMEOUT"
  | "UNEXPECTED";

export interface ApiErrorBody {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
  };
}

export interface ExtractSuccessBody {
  success: true;
  post: InstagramPost;
}

export type ExtractResponseBody = ExtractSuccessBody | ApiErrorBody;

export class AppError extends Error {
  public readonly code: ApiErrorCode;
  public readonly status: number;

  constructor(code: ApiErrorCode, message: string, status: number) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}
