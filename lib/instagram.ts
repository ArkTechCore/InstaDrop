import { isAllowedMediaHost } from "./security";
import { AppError, type InstagramMediaItem, type InstagramPost } from "./types";
import { validateInstagramUrl } from "./validation";

export interface InstagramExtractor {
  extract(url: string): Promise<InstagramPost>;
}

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_HTML_CHARS = 1_200_000;

type StrategyContext = {
  normalizedUrl: string;
  shortcode: string;
  kind: "p" | "reel" | "reels";
};

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export async function extractInstagramMedia(url: string): Promise<InstagramPost> {
  const validated = validateInstagramUrl(url);
  const extractor = new PublicPageExtractor();
  return extractor.extract(validated.normalizedUrl);
}

class PublicPageExtractor implements InstagramExtractor {
  async extract(url: string): Promise<InstagramPost> {
    const { normalizedUrl, shortcode, kind } = validateInstagramUrl(url);
    const html = await fetchPublicPage(normalizedUrl);
    const context = { normalizedUrl, shortcode, kind };

    return (
      extractFromEmbeddedJson(html, context) ??
      extractVideoCandidatesFromHtml(html, context) ??
      extractFromJsonLd(html, context) ??
      extractFromOpenGraph(html, context) ??
      failExtraction()
    );
  }
}

async function fetchPublicPage(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        accept: "text/html,application/xhtml+xml",
        "accept-language": "en-US,en;q=0.9",
        "user-agent":
          "Mozilla/5.0 (compatible; InstaDrop/1.0; +https://example.com/privacy)"
      }
    });

    if (response.status === 404) {
      throw new AppError("NOT_FOUND", "This Instagram post is no longer available.", 404);
    }

    if (response.status === 401 || response.status === 403) {
      throw new AppError(
        "UPSTREAM_BLOCKED",
        "Instagram temporarily blocked the request. Please try again later.",
        502
      );
    }

    if (!response.ok) {
      throw new AppError(
        "EXTRACTION_FAILED",
        "This public Instagram post could not be retrieved.",
        502
      );
    }

    const text = await response.text();
    return text.slice(0, MAX_HTML_CHARS);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new AppError("TIMEOUT", "The request took too long. Please try again.", 408);
    }

    throw new AppError(
      "EXTRACTION_FAILED",
      "This public Instagram post could not be retrieved.",
      502
    );
  } finally {
    clearTimeout(timeout);
  }
}

function extractFromEmbeddedJson(
  html: string,
  context: StrategyContext
): InstagramPost | null {
  const mediaBlocks = collectMediaBlocks(html);
  for (const media of mediaBlocks) {
    const post = normalizeGraphMedia(media, context);
    if (post) {
      return post;
    }
  }

  return null;
}

function collectMediaBlocks(html: string): Record<string, JsonValue>[] {
  const blocks: Record<string, JsonValue>[] = [];
  const keys = ["shortcode_media", "xdt_shortcode_media"];

  for (const key of keys) {
    let index = html.indexOf(`"${key}"`);
    while (index !== -1 && blocks.length < 8) {
      const colon = html.indexOf(":", index);
      if (colon === -1) {
        break;
      }

      const parsed = parseJsonObjectAt(html, colon + 1);
      if (parsed && isObject(parsed)) {
        blocks.push(parsed);
      }

      index = html.indexOf(`"${key}"`, index + key.length + 2);
    }
  }

  return blocks;
}

function parseJsonObjectAt(source: string, start: number): JsonValue | null {
  let i = start;
  while (i < source.length && /\s/.test(source[i])) {
    i += 1;
  }

  if (source[i] !== "{") {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let j = i; j < source.length; j += 1) {
    const char = source[j];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(source.slice(i, j + 1)) as JsonValue;
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

function extractFromJsonLd(html: string, context: StrategyContext): InstagramPost | null {
  const scripts = [
    ...html.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    )
  ];

  for (const script of scripts) {
    const raw = decodeHtmlEntities(script[1].trim());
    try {
      const data = JSON.parse(raw) as JsonValue;
      const post = normalizeJsonLd(data, context);
      if (post) {
        return post;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function extractFromOpenGraph(html: string, context: StrategyContext): InstagramPost | null {
  const video = readMeta(html, "og:video") ?? readMeta(html, "og:video:secure_url");
  const image = readMeta(html, "og:image");
  const description = readMeta(html, "og:description");

  if (video && isSafeMediaUrl(video)) {
    const item: InstagramMediaItem = {
      id: "1",
      type: "video",
      url: video,
      thumbnail: image && isSafeMediaUrl(image) ? image : undefined
    };
    return {
      type: "video",
      shortcode: context.shortcode,
      caption: description,
      thumbnail: item.thumbnail,
      items: [item]
    };
  }

  if (context.kind !== "p") {
    return null;
  }

  if (image && isSafeMediaUrl(image)) {
    return {
      type: "image",
      shortcode: context.shortcode,
      caption: description,
      thumbnail: image,
      items: [{ id: "1", type: "image", url: image }]
    };
  }

  return null;
}

function normalizeGraphMedia(
  media: Record<string, JsonValue>,
  context: StrategyContext
): InstagramPost | null {
  const edgeChildren = getObject(media, "edge_sidecar_to_children");
  const edges = getArray(edgeChildren, "edges");
  const children = edges
    .map((edge) => (isObject(edge) ? getObject(edge, "node") : undefined))
    .filter((node): node is Record<string, JsonValue> => Boolean(node));

  const nodes = children.length > 0 ? children : [media];
  const items = nodes
    .map((node, index) => mediaItemFromGraphNode(node, index + 1, context))
    .filter((item): item is InstagramMediaItem => Boolean(item));

  if (items.length === 0) {
    return null;
  }

  const caption = readCaption(media);
  const postType = items.length > 1 ? "carousel" : items[0].type;

  return {
    type: postType,
    shortcode: readString(media, "shortcode") ?? context.shortcode,
    caption,
    thumbnail: items[0].thumbnail ?? items[0].url,
    items
  };
}

function mediaItemFromGraphNode(
  node: Record<string, JsonValue>,
  id: number,
  context: StrategyContext
): InstagramMediaItem | null {
  const isVideo = readBoolean(node, "is_video");
  const videoUrl = readString(node, "video_url") ?? findFirstVideoUrl(node);
  const displayUrl = readString(node, "display_url");
  const thumbnail = readString(node, "thumbnail_src") ?? displayUrl;
  const dimensions = getObject(node, "dimensions");
  const width = readNumber(dimensions, "width");
  const height = readNumber(dimensions, "height");

  if ((isVideo || context.kind !== "p") && videoUrl && isSafeMediaUrl(videoUrl)) {
    return {
      id: String(id),
      type: "video",
      url: videoUrl,
      thumbnail: thumbnail && isSafeMediaUrl(thumbnail) ? thumbnail : undefined,
      width,
      height
    };
  }

  if (context.kind !== "p") {
    return null;
  }

  if (displayUrl && isSafeMediaUrl(displayUrl)) {
    return {
      id: String(id),
      type: "image",
      url: displayUrl,
      thumbnail: displayUrl,
      width,
      height
    };
  }

  return null;
}

function extractVideoCandidatesFromHtml(
  html: string,
  context: StrategyContext
): InstagramPost | null {
  const urls = collectVideoUrlsFromHtml(html);

  if (urls.length === 0) {
    return null;
  }

  const image = readMeta(html, "og:image");
  const description = readMeta(html, "og:description");
  const selectedUrls = context.kind === "p" ? urls.slice(0, 8) : urls.slice(0, 1);
  const items = selectedUrls.map<InstagramMediaItem>((url, index) => ({
    id: String(index + 1),
    type: "video",
    url,
    thumbnail: image && isSafeMediaUrl(image) ? image : undefined
  }));

  return {
    type: items.length > 1 ? "carousel" : "video",
    shortcode: context.shortcode,
    caption: description,
    thumbnail: items[0].thumbnail,
    items
  };
}

function collectVideoUrlsFromHtml(html: string): string[] {
  const urls = new Map<string, string>();
  const decoded = decodeHtmlEntities(html)
    .replace(/\\u0026/g, "&")
    .replace(/\\u003d/g, "=")
    .replace(/\\\//g, "/");

  const directVideoMatches = decoded.matchAll(
    /https:\/\/[^"'<>\\\s]+?\.(?:mp4|m4v)(?:\?[^"'<>\\\s]*)?/gi
  );
  for (const match of directVideoMatches) {
    addSafeVideoUrl(urls, match[0]);
  }

  const jsonStringMatches = html.matchAll(
    /"(video_url|playback_url|dash_manifest|url)"\s*:\s*"((?:\\.|[^"\\])*)"/g
  );
  for (const match of jsonStringMatches) {
    const key = match[1];
    const value = parseJsonString(match[2]);
    if (!value) {
      continue;
    }

    if (key === "url" && !nearVideoVersions(html, match.index ?? 0)) {
      continue;
    }

    addSafeVideoUrl(urls, value);
  }

  return [...urls.values()];
}

function nearVideoVersions(source: string, index: number): boolean {
  const start = Math.max(0, index - 500);
  return source.slice(start, index).includes("video_versions");
}

function addSafeVideoUrl(urls: Map<string, string>, raw: string): void {
  const normalized = decodeHtmlEntities(raw)
    .replace(/\\u0026/g, "&")
    .replace(/\\u003d/g, "=")
    .replace(/\\\//g, "/");

  if (normalized.includes(".mp4") && isSafeMediaUrl(normalized)) {
    const parsed = new URL(normalized);
    urls.set(`${parsed.origin}${parsed.pathname}`, normalized);
  }
}

function parseJsonString(value: string): string | null {
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return value;
  }
}

function findFirstVideoUrl(value: JsonValue): string | undefined {
  if (typeof value === "string") {
    return value.includes(".mp4") && isSafeMediaUrl(value) ? value : undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstVideoUrl(item);
      if (found) {
        return found;
      }
    }
    return undefined;
  }

  if (!isObject(value)) {
    return undefined;
  }

  const likelyKeys = ["video_url", "playback_url", "src", "url"];
  for (const key of likelyKeys) {
    const direct = readString(value, key);
    if (direct?.includes(".mp4") && isSafeMediaUrl(direct)) {
      return direct;
    }
  }

  for (const child of Object.values(value)) {
    const found = findFirstVideoUrl(child);
    if (found) {
      return found;
    }
  }

  return undefined;
}

function normalizeJsonLd(data: JsonValue, context: StrategyContext): InstagramPost | null {
  const candidates = Array.isArray(data) ? data : [data];
  const items: InstagramMediaItem[] = [];

  for (const candidate of candidates) {
    if (!isObject(candidate)) {
      continue;
    }

    const type = readString(candidate, "@type");
    const contentUrl = readString(candidate, "contentUrl") ?? readString(candidate, "url");
    const image = readString(candidate, "image") ?? readString(candidate, "thumbnailUrl");

    if (type?.toLowerCase().includes("video") && contentUrl && isSafeMediaUrl(contentUrl)) {
      items.push({
        id: String(items.length + 1),
        type: "video",
        url: contentUrl,
        thumbnail: image && isSafeMediaUrl(image) ? image : undefined
      });
    } else if (image && isSafeMediaUrl(image)) {
      items.push({
        id: String(items.length + 1),
        type: "image",
        url: image,
        thumbnail: image
      });
    }
  }

  if (items.length === 0) {
    return null;
  }

  return {
    type: items.length > 1 ? "carousel" : items[0].type,
    shortcode: context.shortcode,
    caption: null,
    thumbnail: items[0].thumbnail ?? items[0].url,
    items
  };
}

function readMeta(html: string, property: string): string | null {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["'][^>]*>`,
      "i"
    )
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtmlEntities(match[1]);
    }
  }

  return null;
}

function readCaption(media: Record<string, JsonValue>): string | null {
  const edgeCaption = getObject(media, "edge_media_to_caption");
  const edges = getArray(edgeCaption, "edges");
  const firstNode = isObject(edges[0]) ? getObject(edges[0], "node") : undefined;
  return readString(firstNode, "text") ?? null;
}

function isSafeMediaUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && isAllowedMediaHost(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function failExtraction(): never {
  throw new AppError(
    "EXTRACTION_FAILED",
    "This public Instagram post could not be retrieved.",
    502
  );
}

function isObject(value: JsonValue | undefined): value is Record<string, JsonValue> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getObject(
  obj: Record<string, JsonValue> | undefined,
  key: string
): Record<string, JsonValue> | undefined {
  const value = obj?.[key];
  return isObject(value) ? value : undefined;
}

function getArray(obj: Record<string, JsonValue> | undefined, key: string): JsonValue[] {
  const value = obj?.[key];
  return Array.isArray(value) ? value : [];
}

function readString(obj: Record<string, JsonValue> | undefined, key: string): string | undefined {
  const value = obj?.[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readBoolean(obj: Record<string, JsonValue> | undefined, key: string): boolean {
  return obj?.[key] === true;
}

function readNumber(obj: Record<string, JsonValue> | undefined, key: string): number | undefined {
  const value = obj?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
