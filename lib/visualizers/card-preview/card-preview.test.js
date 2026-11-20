import { describe, it, expect } from "vitest";
import { render } from "./renderer.js";
import { render as renderImageText } from "../image-text/renderer.js";
import { render as renderQuotes } from "../quotes-stack/renderer.js";
import { parse as parseQuotes } from "../quotes-stack/parser.js";
import { render as renderTeam } from "../image-grid/renderer.js";

const items = [
  { title: "Regency Ballroom", url: "/projects/regency-ballroom/", image: "/og/a.jpeg", subtitle: "A 1908 Air System", location: "San Francisco, CA", building_type: "Theater" },
  { title: "Plain", url: "/projects/plain/" },
];

describe("card-preview styles", () => {
  it("default (zigzag) keeps the original markup: no style class, no info line", () => {
    const html = render(items, { limit: 1, show_more: true });
    expect(html).toMatch(/<section class="projects" id="projects">/);
    expect(html).not.toContain("projects__info");
    expect(html).toContain("no-visible hidden");
    expect(html).toContain("MORE PROJECTS");
  });

  for (const style of ["grid", "list", "mosaic"]) {
    it(`style=${style}: real links, titles and the info line`, () => {
      const html = render(items, { style });
      expect(html).toContain(`projects--${style}`);
      expect(html).toContain('href="/projects/regency-ballroom/"');
      expect(html).toContain("Regency Ballroom</h2>");
      expect(html).toContain("Theater · San Francisco, CA");
    });
  }

  it("only list shows the subtitle; unknown style falls back to zigzag", () => {
    expect(render(items, { style: "list" })).toContain("A 1908 Air System");
    expect(render(items, { style: "grid" })).not.toContain("A 1908 Air System");
    expect(render(items, { style: "bogus" })).toMatch(/<section class="projects" id="projects">/);
  });
});

describe("card-preview more_link", () => {
  it("renders a real link instead of the toggle and only the first `limit` cards", () => {
    const html = render(items, { limit: 1, show_more: true, more_link: "/projects/", style: "steps" });
    expect(html).toContain('<div class="projects__all-projects">');
    expect(html).toContain('href="/projects/"');
    expect(html).toContain("SEE ALL PROJECTS");
    expect(html).not.toContain("MORE PROJECTS");
    expect(html).not.toContain("no-visible hidden");
    expect(html).not.toContain('href="/projects/plain/"');
  });
  it("more_text changes the label", () => {
    expect(render(items, { more_link: "/projects/", more_text: "All work" })).toContain(">All work <span");
  });
});

describe("image-text zoom", () => {
  it("zoom=slowly-in adds the class and data attribute; unknown values add nothing", () => {
    const on = renderImageText({ imageSrc: "/media/a.jpg", imageAlt: "", textHtml: "" }, { zoom: "slowly-in" });
    expect(on).toContain("image-text--zoom-slowly-in");
    expect(on).toContain('data-zoom="slowly-in"');
    const off = renderImageText({ imageSrc: "/media/a.jpg", imageAlt: "", textHtml: "" }, { zoom: "fast" });
    expect(off).not.toContain("zoom");
  });
});

describe("quotes-stack title", () => {
  const yaml = "title: Quotes from our Clients\nquotes:\n  - quote: Hi\n    name: A\n    date: 1\n    color: red\n";
  it("reads title: from the YAML and renders it as the section heading", () => {
    const html = renderQuotes(parseQuotes(yaml));
    expect(html).toContain('<h1 class="h1-medium musings__heading">Quotes from our Clients</h1>');
  });
  it("defaults to Musings", () => {
    expect(renderQuotes(parseQuotes("quotes:\n  - quote: Hi\n    name: A\n"))).toContain(">Musings</h1>");
  });
});

describe("image-grid inline markdown", () => {
  it("renders **bold** names and escapes HTML", () => {
    const html = renderTeam([{ src: "/media/a.jpg", alt: "A", name: "**Shannon Allison**", role: "Plumbing & <Fire>" }]);
    expect(html).toContain("<strong>Shannon Allison</strong>");
    expect(html).toContain("Plumbing &amp; &lt;Fire&gt;");
  });
});
