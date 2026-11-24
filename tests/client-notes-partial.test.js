/**
 * The client-notes loader partial: silent unless a site sets `client_notes`, and even then it only
 * loads the button module when there is a reason to (?notes, a pass in the fragment, a stored pass).
 */
import { describe, it, expect } from "vitest";
import nunjucks from "nunjucks";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PARTIAL = fs.readFileSync(path.join(__dirname, "../themes/_base/partials/client-notes.njk"), "utf-8");

const env = new nunjucks.Environment();
env.addFilter("url", (u) => u);
const render = (site) => env.renderString(PARTIAL, { site });

describe("client notes loader", () => {
  it("emits nothing without client_notes", () => {
    expect(render({}).trim()).toBe("");
    expect(render({ client_notes: null }).trim()).toBe("");
  });

  it("emits nothing with only one of the two fields", () => {
    expect(render({ client_notes: { client: "alter-engineers" } }).trim()).toBe("");
    expect(render({ client_notes: { post_office: "https://post-office.bloob.haus" } }).trim()).toBe("");
  });

  it("with both, the guard carries the client, the post office and the storage key", () => {
    const html = render({ client_notes: { client: "alter-engineers", post_office: "https://post-office.bloob.haus" } });
    expect(html).toContain("<script>");
    expect(html).toContain('"alter-engineers"');
    expect(html).toContain('"https://post-office.bloob.haus"');
    expect(html).toContain("bloob-client-pass:");
    expect(html).toContain("/assets/js/client-notes.js");
    expect(html).toContain("bloob-pass=");
  });

  it("a client id with a quote is escaped", () => {
    const html = render({ client_notes: { client: 'a"</script><b>', post_office: "https://p" } });
    expect(html).not.toContain('a"</script>');
  });
});
