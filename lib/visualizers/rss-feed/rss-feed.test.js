import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseRssFeed, extractItems, renderEpisodeList, extractPlatforms, parseUrlValue } from "./index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "manifest.json"), "utf-8"));

const FIXTURE_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>Test Podcast</title>
    <link>https://example.com/podcast</link>
    <description>A test podcast.</description>
    <item>
      <title><![CDATA[Episode 3: The Return]]></title>
      <link>https://example.com/ep3</link>
      <pubDate>Mon, 01 Jan 2024 10:00:00 +0000</pubDate>
      <enclosure url="https://audio.example.com/ep3.mp3" length="12345" type="audio/mpeg"/>
      <itunes:duration>42:00</itunes:duration>
      <itunes:episode>3</itunes:episode>
    </item>
    <item>
      <title>Episode 2: Basics</title>
      <link>https://example.com/ep2</link>
      <pubDate>Mon, 25 Dec 2023 10:00:00 +0000</pubDate>
      <enclosure url="https://audio.example.com/ep2.mp3" length="9999" type="audio/mpeg"/>
      <itunes:duration>30:15</itunes:duration>
      <itunes:episode>2</itunes:episode>
    </item>
    <item>
      <title>Episode 1: Pilot</title>
      <link>https://example.com/ep1</link>
      <pubDate>Mon, 18 Dec 2023 10:00:00 +0000</pubDate>
      <enclosure url="https://audio.example.com/ep1.mp3" length="8888" type="audio/mpeg"/>
      <itunes:episode>1</itunes:episode>
    </item>
  </channel>
</rss>`;

describe("rss-feed manifest", () => {
  it("has name rss-feed", () => {
    expect(manifest.name).toBe("rss-feed");
  });
  it("has type file-scope", () => {
    expect(manifest.type).toBe("file-scope");
  });
  it("requires rss setting", () => {
    expect(manifest.settings.rss.required).toBe(true);
  });
});

describe("parseRssFeed", () => {
  const feed = parseRssFeed(FIXTURE_RSS);

  it("extracts channel title", () => {
    expect(feed.title).toBe("Test Podcast");
  });

  it("extracts channel link", () => {
    expect(feed.link).toBe("https://example.com/podcast");
  });

  it("returns all items", () => {
    expect(feed.items).toHaveLength(3);
  });
});

describe("extractItems", () => {
  const items = extractItems(FIXTURE_RSS);

  it("extracts title from CDATA", () => {
    expect(items[0].title).toBe("Episode 3: The Return");
  });

  it("extracts title from plain text", () => {
    expect(items[1].title).toBe("Episode 2: Basics");
  });

  it("extracts episode link", () => {
    expect(items[0].link).toBe("https://example.com/ep3");
  });

  it("extracts enclosure URL", () => {
    expect(items[0].enclosureUrl).toBe("https://audio.example.com/ep3.mp3");
  });

  it("extracts itunes:episode", () => {
    expect(items[0].episode).toBe("3");
  });

  it("extracts itunes:duration", () => {
    expect(items[0].duration).toBe("42:00");
  });

  it("returns null duration when absent", () => {
    expect(items[2].duration).toBeNull();
  });
});

describe("parseUrlValue", () => {
  it("returns a plain URL unchanged", () => {
    expect(parseUrlValue("https://open.spotify.com/show/abc")).toBe("https://open.spotify.com/show/abc");
  });

  it("extracts URL from markdown link with display text", () => {
    expect(parseUrlValue("[https://podcasts.apple.com/](https://podcasts.apple.com/de/podcast/foo/id123)"))
      .toBe("https://podcasts.apple.com/de/podcast/foo/id123");
  });

  it("extracts URL from markdown link with empty display text", () => {
    expect(parseUrlValue("[](https://example.com/show)")).toBe("https://example.com/show");
  });

  it("returns null for non-URL strings", () => {
    expect(parseUrlValue("not a url")).toBeNull();
  });

  it("returns null for null/undefined", () => {
    expect(parseUrlValue(null)).toBeNull();
    expect(parseUrlValue(undefined)).toBeNull();
  });
});

describe("extractPlatforms", () => {
  it("picks up flat spotify key", () => {
    const p = extractPlatforms({ rss: "https://feed.com", spotify: "https://open.spotify.com/show/abc" });
    expect(p.spotify).toBe("https://open.spotify.com/show/abc");
  });

  it("parses markdown link as apple value", () => {
    const p = extractPlatforms({
      apple: "[https://podcasts.apple.com/](https://podcasts.apple.com/de/podcast/foo/id123)",
    });
    expect(p.apple).toBe("https://podcasts.apple.com/de/podcast/foo/id123");
  });

  it("supports legacy platforms: {} nesting", () => {
    const p = extractPlatforms({ platforms: { spotify: "https://open.spotify.com/show/abc" } });
    expect(p.spotify).toBe("https://open.spotify.com/show/abc");
  });

  it("ignores unknown keys", () => {
    const p = extractPlatforms({ rss: "https://feed.com", myBlog: "https://blog.com" });
    expect(p.myBlog).toBeUndefined();
  });

  it("returns empty object when no platforms given", () => {
    expect(extractPlatforms({ rss: "https://feed.com" })).toEqual({});
  });
});

describe("renderEpisodeList", () => {
  const feed = parseRssFeed(FIXTURE_RSS);

  it("renders a wrapper div", () => {
    const html = renderEpisodeList(feed);
    expect(html).toContain('class="rss-feed-visualizer"');
  });

  it("renders an episode list", () => {
    const html = renderEpisodeList(feed);
    expect(html).toContain('class="rss-episode-list"');
  });

  it("renders episode titles as links", () => {
    const html = renderEpisodeList(feed);
    expect(html).toContain("Episode 3: The Return");
    expect(html).toContain('href="https://example.com/ep3"');
  });

  it("renders episode numbers", () => {
    const html = renderEpisodeList(feed);
    expect(html).toContain('class="rss-ep-number"');
  });

  it("renders platform badges when provided", () => {
    const html = renderEpisodeList(feed, {
      spotify: "https://open.spotify.com/show/test",
      apple: "https://podcasts.apple.com/test",
    });
    expect(html).toContain('class="rss-platforms"');
    expect(html).toContain("Spotify");
    expect(html).toContain("Apple Podcasts");
    expect(html).toContain("https://open.spotify.com/show/test");
  });

  it("omits platform bar when no platforms given", () => {
    const html = renderEpisodeList(feed, {});
    expect(html).not.toContain('class="rss-platforms"');
  });

  it("escapes HTML in episode titles", () => {
    const malicious = parseRssFeed(
      FIXTURE_RSS.replace("Episode 3: The Return", "<script>alert(1)</script>")
    );
    const html = renderEpisodeList(malicious);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("falls back to enclosure URL when link is absent", () => {
    const noLink = {
      title: "Test",
      items: [{ title: "Ep", link: null, enclosureUrl: "https://audio.com/ep.mp3", pubDate: null, episode: null }],
    };
    const html = renderEpisodeList(noLink);
    expect(html).toContain("https://audio.com/ep.mp3");
  });
});
