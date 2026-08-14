import { describe, expect, it } from "vitest";
import { validateDownloadTarget } from "@/lib/security";
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

describe("validateDownloadTarget", () => {
  it("preserves signed CDN URLs exactly after validation", () => {
    const mediaUrl =
      "https://scontent.cdninstagram.com/v/t50.2886-16/abc.mp4?stp=dst-mp4&_nc_cat=101&ccb=1-7&_nc_sid=xyz&efg=hash%3Dabc%252Bdef&oh=00_AfBadHash&oe=66C00000";

    expect(validateDownloadTarget(mediaUrl)).toBe(mediaUrl);
  });

  it.each([
    ["https://google.com/file.mp4"],
    ["http://scontent.cdninstagram.com/file.mp4"],
    ["https://localhost/file.mp4"],
    ["javascript:alert(1)"],
    ["https://scontent.cdninstagram.com/file.mp4\r\nx-bad: yes"]
  ])("rejects unsafe download target %s", (input) => {
    expect(() => validateDownloadTarget(input)).toThrow();
  });
});
