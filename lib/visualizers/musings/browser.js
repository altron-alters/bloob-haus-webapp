/**
 * Musings — runtime behavior only (the markup is built by renderer.js at build time).
 *
 * - Reveals the theme filter buttons and filters cards by category.
 * - Folds cards past data-limit behind "More musings" (a filter shows all of its cards).
 * - Phones: the grid is a CSS scroll-snap deck; this adds previous / next buttons and a
 *   "3 / 12" counter. Swiping works without this script.
 *
 * Without JS: every card is visible, the deck still swipes, the Technical fold still opens.
 */

function initWall(root) {
  const grid = root.querySelector(".musings-wall__grid:not(.musings-wall__grid--technical)");
  if (!grid) return;
  const cards = Array.from(grid.querySelectorAll(".musings-wall__card"));
  const limit = parseInt(grid.dataset.limit || "0", 10);
  const more = root.querySelector(".musings-wall__more");
  const pills = Array.from(root.querySelectorAll(".musings-wall__filter"));
  const nav = root.querySelector(".musings-wall__deck-nav");
  const count = root.querySelector(".musings-wall__count");
  let expanded = !(limit && cards.length > limit);
  let filter = "all";

  const visible = () => cards.filter((c) => !c.hidden);

  function currentIndex() {
    const vis = visible();
    if (!vis.length) return 0;
    const left = grid.scrollLeft;
    let best = 0;
    let bestDist = Infinity;
    vis.forEach((c, i) => {
      const d = Math.abs(c.offsetLeft - grid.offsetLeft - left);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return best;
  }

  function updateCount() {
    if (!count) return;
    const vis = visible();
    count.textContent = vis.length ? `${currentIndex() + 1} / ${vis.length}` : "";
  }

  function apply() {
    cards.forEach((c, i) => {
      const inFilter = filter === "all" || c.dataset.category === filter;
      const folded = filter === "all" && !expanded && i >= limit;
      c.hidden = !inFilter || folded;
    });
    if (more) more.hidden = expanded || filter !== "all";
    grid.scrollLeft = 0;
    updateCount();
  }

  pills.forEach((btn) => {
    btn.addEventListener("click", () => {
      filter = btn.dataset.filter || "all";
      pills.forEach((p) => p.setAttribute("aria-pressed", String(p === btn)));
      apply();
    });
  });
  if (pills.length) pills[0].parentElement.hidden = false;

  if (more) {
    more.addEventListener("click", () => {
      const firstFolded = cards[limit];
      expanded = true;
      apply();
      if (firstFolded) {
        firstFolded.setAttribute("tabindex", "-1");
        firstFolded.focus({ preventScroll: true });
      }
    });
  }

  if (nav) {
    nav.hidden = false;
    nav.querySelectorAll(".musings-wall__deck-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const vis = visible();
        const next = Math.min(vis.length - 1, Math.max(0, currentIndex() + parseInt(btn.dataset.dir, 10)));
        if (vis[next]) grid.scrollTo({ left: vis[next].offsetLeft - grid.offsetLeft, behavior: "smooth" });
      });
    });
    let ticking = false;
    grid.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        updateCount();
      });
    }, { passive: true });
  }

  apply();
}

function run() {
  document.querySelectorAll(".musings-wall").forEach(initWall);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
else run();
