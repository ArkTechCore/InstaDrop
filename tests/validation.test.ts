import { describe, expect, it } from "vitest";
import { validateInstagramUrl } from "@/lib/validation";

describe("validateInstagramUrl", () => {
  it.each([
    ["https://www.instagram.com/p/ABC123/"],
    ["https://www.instagram.com/reel/ABC123/"],
    ["https://instagram.com/reels/ABC123/"],
    [" https://m.instagram.com/p/ABC_123-def/?utm_source=ig_web_copy_link "]
  ])("accepts %s", (input) => {
    const result = validateInstagramUrl(input);
    expect(result.normalizedUrl).toMatch(/^https:\/\/www\.instagram\.com\/(p|reel|reels)\//);
    expect(result.shortcode).toBeTruthy();
  });

  it.each([
    ["https://facebook.com/test"],
    ["https://youtube.com/watch?v=test"],
    ["ftp://instagram.com/p/test"],
    ["http://localhost/test"],
    ["javascript:alert(1)"],
    ["not a url"],
    [""],
    ["https://www.instagram.com/stories/example/123/"]
  ])("rejects %s", (input) => {
    expect(() => validateInstagramUrl(input)).toThrow();
  });
});
