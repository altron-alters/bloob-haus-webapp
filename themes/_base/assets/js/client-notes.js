/**
 * Client notes: a hidden note button for client sites (spec: bloob-haus-cloud
 * docs/superpowers/specs/2026-11-23-client-notes-design.md).
 *
 * Nobody sees anything until they open the site's secret link (`?notes`). That sends the page to
 * the post office's /pass, where they sign in with Google; if their verified email is allowed for
 * this client, the post office sends them back here with a note pass in the URL fragment. The pass
 * is kept in this browser (localStorage, 90 days) and from then on every page shows the note button.
 * The pass can only send notes; the post office checks it, and the account, on every note.
 *
 * Loaded only by partials/client-notes.njk, and only when there is something to do.
 * The pure half (readPassFromHash … noteBody) is unit-tested in tests/client-notes.test.js.
 * describePicked and the pointing mode are ported from upstream lib/visualizers/_engine/feedback.js
 * (the AE fork does not have the engine yet); fold the two together when the fork syncs.
 */

const PASS_KEYS = ["bloob-pass", "email", "exp"];
const squash = (s) => String(s || "").replace(/\s+/g, " ").trim();
const storageKey = (client) => `bloob-client-pass:${client}`;

/** The pass the post office put in the fragment, and the fragment without it. */
export function readPassFromHash(hash) {
  const raw = String(hash || "").replace(/^#/, "");
  if (!raw.includes("bloob-pass=")) return { pass: null, rest: hash ? String(hash) : "" };
  const params = new URLSearchParams(raw);
  const token = params.get("bloob-pass");
  const email = params.get("email");
  const exp = Number(params.get("exp"));
  for (const k of PASS_KEYS) params.delete(k);
  const left = params.toString();
  const pass = token && email && Number.isFinite(exp) ? { token, email, exp } : null;
  return { pass, rest: left ? `#${left}` : "" };
}

/** A stored pass is usable when it is whole and has not run out (exp is in seconds). */
export function passUsable(stored, nowMs) {
  return (
    !!stored && typeof stored === "object" &&
    typeof stored.token === "string" && !!stored.token &&
    typeof stored.email === "string" && !!stored.email &&
    typeof stored.exp === "number" && stored.exp * 1000 > nowMs
  );
}

/** The five choices in the form, as the post office takes them. */
export function kindFields(choice) {
  if (choice === "bug" || choice === "idea") return { kind: choice };
  if (choice === "ui") return { kind: "other", kind_label: "UI" };
  if (choice === "ux") return { kind: "other", kind_label: "UX" };
  return { kind: "other" };
}

/** A picked element in one line (at most 120 characters): where it is, and a bit of its text. */
export function describePicked({ text, path }) {
  const words = squash(text);
  if (!words) return String(path).slice(0, 120);
  const room = 120 - path.length - 4;
  const bit = room > 12 ? (words.length > room ? `${words.slice(0, room - 1)}…` : words) : "";
  return bit ? `${path} “${bit}”` : String(path).slice(0, 120);
}

const MAX_CLICKS = 30;

/** What the button sends: the note, the page, what was pointed at, and (if asked) what was clicked. */
export function noteBody({ choice, text, pageUrl, picked, clicks, now = new Date().toISOString() }) {
  const body = { ...kindFields(choice), text: String(text || "").trim(), route: String(pageUrl).slice(0, 300) };
  const log = [];
  if (picked) {
    const where = describePicked(picked);
    body.text += `\n\nPointing at: ${where}`;
    log.push({ t: now, kind: "picked", label: where });
  }
  if (Array.isArray(clicks)) {
    for (const c of clicks.slice(-MAX_CLICKS)) log.push({ t: now, kind: "click", label: squash(c).slice(0, 120) });
  }
  if (log.length) body.log = log;
  return body;
}

/* ─── Browser ──────────────────────────────────────────────────────────────────────────────── */

function readStored(client) {
  try { return JSON.parse(localStorage.getItem(storageKey(client)) || "null"); } catch { return null; }
}
function writeStored(client, pass) {
  try { localStorage.setItem(storageKey(client), JSON.stringify(pass)); } catch { /* private mode: no button */ }
}
function forget(client) {
  try { localStorage.removeItem(storageKey(client)); } catch { /* nothing to do */ }
}

/** Entry point, from partials/client-notes.njk. `hash` is the fragment as the page arrived: the
 *  partial has already taken the pass out of the address bar, before anything else could read it. */
export function start({ client, postOffice, hash = location.hash }) {
  const { pass, rest } = readPassFromHash(hash);
  if (hash.includes("bloob-pass=")) {
    if (pass) writeStored(client, pass);
    if (location.hash.includes("bloob-pass=")) history.replaceState(history.state, "", location.pathname + location.search + rest);
  }

  const search = new URLSearchParams(location.search);
  if (search.has("notes")) {
    search.delete("notes");
    const q = search.toString();
    const back = `${location.origin}${location.pathname}${q ? `?${q}` : ""}`;
    location.replace(`${postOffice.replace(/\/$/, "")}/pass?client=${encodeURIComponent(client)}&return=${encodeURIComponent(back)}`);
    return;
  }

  const stored = readStored(client);
  if (!passUsable(stored, Date.now())) { forget(client); return; }
  mount({ client, postOffice, pass: stored });
}

const ICON_NOTE = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"/><path d="M12 8v6"/><path d="M9 11h6"/></svg>';
const ICON_CROSSHAIR = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="22" x2="18" y1="12" y2="12"/><line x1="6" x2="2" y1="12" y2="12"/><line x1="12" x2="12" y1="6" y2="2"/><line x1="12" x2="12" y1="22" y2="18"/></svg>';
const ICON_X = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

const KINDS = [["bug", "Bug"], ["idea", "Idea"], ["ui", "UI"], ["ux", "UX"], ["other", "Something else"]];

function mount({ client, postOffice, pass }) {
  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = new URL("../css/client-notes.css", import.meta.url).href;
  document.head.append(css);

  // What was clicked on this page, kept in memory only, sent only if the box is ticked.
  const clicks = [];
  document.addEventListener("click", (e) => {
    const el = e.target instanceof Element ? e.target.closest("a, button") : null;
    if (!el || el.closest(".client-notes")) return;
    const label = squash(el.getAttribute("aria-label") || el.textContent || el.getAttribute("href") || el.localName);
    if (label) clicks.push(`${el.localName}: ${label}`);
    if (clicks.length > MAX_CLICKS) clicks.shift();
  }, true);

  const root = document.createElement("div");
  root.className = "client-notes";
  root.setAttribute("data-pagefind-ignore", "");
  root.innerHTML = `
    <div class="client-notes__panel" role="dialog" aria-label="Send a note about this site" hidden>
      <div class="client-notes__head">
        <h2>Something broke, or an idea?</h2>
        <button type="button" class="client-notes__close" aria-label="Close">${ICON_X}</button>
      </div>
      <form>
        <fieldset class="client-notes__kinds"><legend class="client-notes__sr">What kind of note</legend>
          ${KINDS.map(([v, l], i) => `<label><input type="radio" name="kind" value="${v}"${i === 0 ? " checked" : ""}> <span>${l}</span></label>`).join("")}
        </fieldset>
        <textarea name="text" rows="3" maxlength="3800" required aria-label="Your note" placeholder="What happened, or what would help?"></textarea>
        <div class="client-notes__row">
          <span class="client-notes__who">Sending as <b></b> · <button type="button" class="client-notes__link" data-signout>sign out</button></span>
          <button type="button" class="client-notes__point" title="Point at something on this page" aria-label="Point at something on this page">${ICON_CROSSHAIR}</button>
        </div>
        <p class="client-notes__picked" hidden>Pointing at <span></span> <button type="button" class="client-notes__link" data-unpick aria-label="Stop pointing">×</button></p>
        <label class="client-notes__trail"><input type="checkbox" name="trail"> <span>Attach what I clicked on this page. No content is saved, only which buttons were pressed.</span></label>
        <div class="client-notes__send"><p class="client-notes__status" aria-live="polite"></p><button type="submit">Send</button></div>
      </form>
    </div>
    <button type="button" class="client-notes__open" aria-expanded="false" aria-label="Send a note about this site" title="Send a note">${ICON_NOTE}</button>`;
  document.body.append(root);

  const panel = root.querySelector(".client-notes__panel");
  const open = root.querySelector(".client-notes__open");
  const form = root.querySelector("form");
  const status = root.querySelector(".client-notes__status");
  const pickedRow = root.querySelector(".client-notes__picked");
  root.querySelector(".client-notes__who b").textContent = pass.email;
  let picked = null;

  const show = (on) => { panel.hidden = !on; open.setAttribute("aria-expanded", String(on)); if (on) form.text.focus(); };
  open.addEventListener("click", () => show(panel.hidden));
  root.querySelector(".client-notes__close").addEventListener("click", () => show(false));
  const showPicked = () => {
    pickedRow.hidden = !picked;
    if (picked) pickedRow.querySelector("span").textContent = describePicked(picked);
  };
  root.querySelector("[data-unpick]").addEventListener("click", () => { picked = null; showPicked(); });
  root.querySelector("[data-signout]").addEventListener("click", () => { forget(client); root.remove(); });
  root.querySelector(".client-notes__point").addEventListener("click", () => {
    panel.hidden = true;
    point((el) => {
      if (el) picked = { text: el.innerText || el.getAttribute("alt") || "", path: elementPath(el) };
      show(true);
      showPicked();
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = form.text.value;
    if (!text.trim()) return;
    status.textContent = "Sending…";
    const body = noteBody({ choice: form.kind.value, text, pageUrl: location.href, picked, clicks: form.trail.checked ? [...clicks] : undefined });
    fetch(`${postOffice.replace(/\/$/, "")}/api/feedback`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${pass.token}` },
      body: JSON.stringify(body),
    })
      .then(async (r) => {
        if (r.ok) { form.reset(); picked = null; showPicked(); status.textContent = "Thank you. It's on its way."; return; }
        const msg = await r.json().then((j) => j && j.error).catch(() => null);
        status.textContent = msg || "That didn't go through.";
        if (r.status === 401) { forget(client); setTimeout(() => root.remove(), 4000); }
      })
      .catch(() => { status.textContent = "That didn't go through."; });
  });
}

// Where an element sits, short: up to four steps, each a tag with its id or first class.
function elementPath(el) {
  const steps = [];
  for (let n = el; n && n.nodeType === 1 && n !== document.body && steps.length < 4; n = n.parentElement) {
    const cls = [...n.classList].find((c) => !c.startsWith("is-") && !c.startsWith("bh-"));
    steps.unshift(n.id ? `${n.localName}#${n.id}` : cls ? `${n.localName}.${cls}` : n.localName);
  }
  return steps.join(" > ");
}

// Pointing mode: an outline follows the element under the pointer; a click picks it, Esc stops.
function point(done) {
  const outline = document.createElement("div");
  outline.className = "client-notes-pick";
  const hint = document.createElement("div");
  hint.className = "client-notes-hint";
  hint.textContent = "Click what your note is about. Esc to stop.";
  document.body.append(outline, hint);
  document.documentElement.classList.add("client-notes-pointing");
  const target = (e) => {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    return el && !el.closest(".client-notes, .client-notes-hint, .client-notes-pick") ? el : null;
  };
  const move = (e) => {
    const el = target(e);
    outline.hidden = !el;
    if (!el) return;
    const r = el.getBoundingClientRect();
    Object.assign(outline.style, { top: `${r.top - 3}px`, left: `${r.left - 3}px`, width: `${r.width + 6}px`, height: `${r.height + 6}px` });
  };
  const finish = (el) => {
    removeEventListener("pointermove", move, true);
    removeEventListener("click", click, true);
    removeEventListener("keydown", key, true);
    outline.remove();
    hint.remove();
    document.documentElement.classList.remove("client-notes-pointing");
    done(el);
  };
  const click = (e) => { e.preventDefault(); e.stopImmediatePropagation(); finish(target(e)); };
  const key = (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); finish(null); } };
  addEventListener("pointermove", move, true);
  addEventListener("click", click, true);
  addEventListener("keydown", key, true);
}
