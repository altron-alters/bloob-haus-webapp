import { describe, it, expect } from "vitest";
import { parse } from "./parser.js";
import { render } from "./renderer.js";

describe("heading-and-paragraph", () => {
  it("a > line becomes the callout quote, the rest the paragraph", () => {
    const d = parse("## About Us\n\n> We bring a deep respect for people.\n\nAlter Engineers was founded.");
    expect(d).toEqual({ heading: "About Us", paragraph: "Alter Engineers was founded.", quote: "We bring a deep respect for people." });
    const html = render(d);
    expect(html).toContain('<blockquote class="heading-and-paragraph__quote"><p>We bring a deep respect for people.</p></blockquote>');
    expect(html).toContain("heading-and-paragraph--with-quote");
    expect(html).not.toContain("&gt;");
  });
  it("without a quote the markup is unchanged (no lead wrapper)", () => {
    const html = render(parse("## About Us\n\nBody."));
    expect(html).not.toContain("__lead");
    expect(html).not.toContain("--with-quote");
    expect(html).toContain('<h1 class="heading-and-paragraph__heading">About Us</h1>');
  });
});
