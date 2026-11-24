/**
 * Client notes — the pure half of themes/_base/assets/js/client-notes.js.
 * The browser half (pointing, the panel, sending) is checked by hand in a real browser.
 */
import { describe, it, expect } from "vitest";
import {
  readPassFromHash,
  passUsable,
  kindFields,
  describePicked,
  noteBody,
} from "../themes/_base/assets/js/client-notes.js";

describe("the pass in the address", () => {
  it("reads the pass and keeps other hash params", () => {
    const r = readPassFromHash("#bloob-pass=t.s&email=a%40b.com&exp=99&x=1");
    expect(r.pass).toEqual({ token: "t.s", email: "a@b.com", exp: 99 });
    expect(r.rest).toBe("#x=1");
  });

  it("a plain anchor is not a pass", () => {
    expect(readPassFromHash("#about-us")).toEqual({ pass: null, rest: "#about-us" });
    expect(readPassFromHash("")).toEqual({ pass: null, rest: "" });
  });

  it("a pass alone leaves no hash behind", () => {
    expect(readPassFromHash("#bloob-pass=t&email=e%40x.com&exp=5").rest).toBe("");
  });

  it("a half pass is no pass, but its params are still wiped", () => {
    const r = readPassFromHash("#bloob-pass=t&exp=nope");
    expect(r.pass).toBeNull();
    expect(r.rest).toBe("");
  });
});

describe("a stored pass", () => {
  const now = 1_800_000_000_000;
  it("expired, missing fields or junk is not usable", () => {
    expect(passUsable(null, now)).toBe(false);
    expect(passUsable("t", now)).toBe(false);
    expect(passUsable({ token: "t" }, now)).toBe(false);
    expect(passUsable({ token: "t", email: "e", exp: now / 1000 - 1 }, now)).toBe(false);
  });
  it("an unexpired whole pass is usable", () => {
    expect(passUsable({ token: "t", email: "e", exp: now / 1000 + 60 }, now)).toBe(true);
  });
});

describe("what a note says", () => {
  it("UI and UX travel as other with a label", () => {
    expect(kindFields("bug")).toEqual({ kind: "bug" });
    expect(kindFields("idea")).toEqual({ kind: "idea" });
    expect(kindFields("ui")).toEqual({ kind: "other", kind_label: "UI" });
    expect(kindFields("ux")).toEqual({ kind: "other", kind_label: "UX" });
    expect(kindFields("other")).toEqual({ kind: "other" });
  });

  it("describePicked stays within 120 characters", () => {
    const long = "word ".repeat(100);
    expect(describePicked({ text: long, path: "main > section#about-us > h2" }).length).toBeLessThanOrEqual(120);
    expect(describePicked({ text: "", path: "main > img" })).toBe("main > img");
  });

  it("a picked element travels in the text and the log", () => {
    const b = noteBody({ choice: "bug", text: "cut off", pageUrl: "https://alterengineers.com/", picked: { text: "About us", path: "h2" } });
    expect(b.kind).toBe("bug");
    expect(b.route).toBe("https://alterengineers.com/");
    expect(b.text).toContain("Pointing at: h2");
    expect(b.log.some((l) => l.kind === "picked")).toBe(true);
    expect(b).not.toHaveProperty("email");
  });

  it("the click trail is capped at 30 lines and has no typed content", () => {
    const clicks = Array.from({ length: 50 }, (_, i) => `button ${i} ${"x".repeat(200)}`);
    const b = noteBody({ choice: "idea", text: "hi", pageUrl: "https://alterengineers.com/", clicks });
    const lines = b.log.filter((l) => l.kind === "click");
    expect(lines).toHaveLength(30);
    expect(lines.every((l) => l.label.length <= 120)).toBe(true);
  });

  it("no clicks and nothing picked means no log", () => {
    const b = noteBody({ choice: "ux", text: "hi", pageUrl: "https://alterengineers.com/" });
    expect(b).toMatchObject({ kind: "other", kind_label: "UX", text: "hi" });
    expect(b.log).toBeUndefined();
  });
});
