import { describe, it, expect } from "vitest";
import { parse, parseMusing } from "./parser.js";
import { render, formatDate, isTechnical } from "./renderer.js";
import { transform } from "./index.js";

const b64 = (s) => Buffer.from(s, "utf-8").toString("base64");

const SAMPLE = `People first
- "This building should be naturally and mechanically ventilated." - Shannon Allison - 2022-01-14
- "People want radiant heat, they just don't know anywhere to get it besides fireplaces." - Stefan Gracik - 09/12/2018

## Electrification
- “Suddenly electrification is easy.” — Matt Dehghani — 2022-08-24

Technical
- "It all comes back to that permaculture mindset." - Brian Croshal - 2022-11-01
`;

describe("musings parser", () => {
  it("reads category lines and their list items", () => {
    const { categories } = parse(SAMPLE);
    expect(categories.map((c) => c.name)).toEqual(["People first", "Electrification", "Technical"]);
    expect(categories[0].items[0]).toEqual({
      quote: "This building should be naturally and mechanically ventilated.",
      name: "Shannon Allison",
      date: "2022-01-14",
    });
  });

  it("accepts curly quotes and em dashes as separators", () => {
    const { categories } = parse(SAMPLE);
    expect(categories[1].items[0]).toEqual({ quote: "Suddenly electrification is easy.", name: "Matt Dehghani", date: "2022-08-24" });
  });

  it("allows a musing with no attribution, quoted or not", () => {
    expect(parseMusing("musing 1")).toEqual({ quote: "musing 1", name: "", date: "" });
    expect(parseMusing('"Feel that breeze."')).toEqual({ quote: "Feel that breeze.", name: "", date: "" });
    expect(parseMusing('"Feel that breeze." - Leon Santen')).toEqual({ quote: "Feel that breeze.", name: "Leon Santen", date: "" });
  });

  it("keeps a dash inside an unquoted sentence as part of the quote", () => {
    expect(parseMusing("Comfort first - energy follows").quote).toBe("Comfort first - energy follows");
    expect(parseMusing("Comfort first - energy follows - Shannon Allison - 2022").name).toBe("Shannon Allison");
  });

  it("keeps quotes inside a quoted musing", () => {
    expect(parseMusing('"It\'s a calibrated model. "Digital twin" sounds fancy." - Stefan Gracik').quote).toBe(
      'It\'s a calibrated model. "Digital twin" sounds fancy.',
    );
  });

  it("puts items before any category line into an unnamed category and drops empty categories", () => {
    const { categories } = parse('- "First." - A\n\nEmpty category\n\nReal\n- "Second." - B');
    expect(categories.map((c) => c.name)).toEqual(["", "Real"]);
  });

  it("strips bold and trailing colons from category lines", () => {
    expect(parse('**Comfort:**\n- "x"').categories[0].name).toBe("Comfort");
  });
});

describe("musings renderer", () => {
  const html = render(parse(SAMPLE), { title: "Musings from our team", limit: "2" });

  it("ships every quote and name as real markup at build time", () => {
    expect(html).toContain("This building should be naturally and mechanically ventilated.");
    expect(html).toContain("Suddenly electrification is easy.");
    expect(html).toContain("Shannon Allison");
    expect(html).toContain(">Musings from our team</h2>");
  });

  it("escapes HTML in quotes and names", () => {
    const out = render(parse('Cat\n- "<script>alert(1)</script>" - <b>X</b>'));
    expect(out).not.toContain("<script>");
    expect(out).toContain("&lt;script&gt;");
  });

  it("puts technical categories in a native details fold, out of the main grid", () => {
    const [mainPart, techPart] = html.split('<details class="musings-wall__technical">');
    expect(mainPart).not.toContain("permaculture");
    expect(techPart).toContain("permaculture");
    expect(techPart).toContain("Technical musings");
  });

  it("writes the limit for browser.js and a hidden More button, without hiding any card", () => {
    expect(html).toContain('data-limit="2"');
    expect(html).toMatch(/<button type="button" class="musings-wall__more" hidden>More musings<\/button>/);
    expect(html).not.toMatch(/musings-wall__card[^"]*"[^>]*hidden/);
  });

  it("renders a filter button per named category, hidden until JS runs", () => {
    expect(html).toContain('data-filter="people-first"');
    expect(html).toContain('data-filter="electrification"');
    expect(html).not.toContain('data-filter="technical"');
    expect(html).toMatch(/musings-wall__filters"[^>]*hidden/);
  });

  it("leaves out filters and the More button when they would do nothing", () => {
    const one = render(parse('Only\n- "a"\n- "b"'), {});
    expect(one).not.toContain("musings-wall__filters");
    expect(one).not.toContain("musings-wall__more");
  });

  it("formats dates and keeps unknown formats as written", () => {
    expect(formatDate("2022-01-14")).toBe("Jan 2022");
    expect(formatDate("09/12/2018")).toBe("Sep 2018");
    expect(formatDate("2026")).toBe("2026");
    expect(formatDate("spring 2025")).toBe("spring 2025");
  });

  it("detects technical categories by name or by the technical= setting", () => {
    expect(isTechnical("Technical")).toBe(true);
    expect(isTechnical("Nerdy stuff")).toBe(true);
    expect(isTechnical("People first")).toBe(false);
    expect(isTechnical("Plumbing", { technical: "Plumbing, Controls" })).toBe(true);
    expect(isTechnical("Technical", { technical: "Plumbing" })).toBe(false);
  });

  it("returns nothing for an empty block", () => {
    expect(render({ categories: [] })).toBe("");
  });
});

describe("musings transform", () => {
  it("replaces the ::: musings section using data-vis-raw and the opener settings", () => {
    const input = `<p>before</p><section class="musings" data-vis-settings='{"title":"Voices","bg":"dark"}' data-vis-raw="${b64(SAMPLE)}">\n<p>rendered list, ignored</p>\n</section><p>after</p>`;
    const out = transform(input);
    expect(out).toContain('<section class="musings-wall bg-dark"');
    expect(out).toContain(">Voices</h2>");
    expect(out).toContain("<p>before</p>");
    expect(out).toContain("<p>after</p>");
    expect(out).not.toContain("rendered list, ignored");
  });

  it("leaves the section alone when there is no data-vis-raw", () => {
    const input = '<section class="musings"><p>x</p></section>';
    expect(transform(input)).toBe(input);
  });

  it("does not touch the older quotes-stack markup", () => {
    const legacy = '<section class="musings" id="musings"><div class="musings__wrapper"></div></section>';
    expect(transform(legacy)).toBe(legacy);
  });
});
