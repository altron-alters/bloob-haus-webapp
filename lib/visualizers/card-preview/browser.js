/**
 * card-preview — runtime, default zig-zag layout only (wide screens, photo and text side
 * by side). The photo alternates sides, so each card can rise into the empty half of
 * the row above. How far depends on photo and title heights, so measure per pair:
 * pull card n+1 up until either
 *   - card n's text (same side as card n+1's photo) is CLEAR px above that photo, or
 *   - card n+1's text (same side as card n's photo) is CLEAR px below that photo.
 * Sets margin-top on each card; CSS (theme) sets the gap to 0 for this to work.
 */
const CLEAR = 24;
const WIDE = "(min-width: 1366px)";

/** Layout box in document coordinates, IGNORING transforms: the theme's scroll-in
 *  animations translate text until it is in view, which getBoundingClientRect includes. */
function box(el) {
  if (!el) return null;
  let top = 0;
  for (let n = el; n; n = n.offsetParent) top += n.offsetTop;
  return { top, bottom: top + el.offsetHeight, height: el.offsetHeight };
}

function layout(section) {
  const cards = [...section.querySelectorAll(".projects__container")].filter((c) => !c.classList.contains("hidden"));
  cards.forEach((c) => (c.style.marginTop = ""));
  if (!window.matchMedia(WIDE).matches) return;
  for (let i = 1; i < cards.length; i++) {
    const prev = cards[i - 1];
    const cur = cards[i];
    const pImg = box(prev.querySelector(".projects__image"));
    const pTxt = box(prev.querySelector(".projects__content"));
    const cImg = box(cur.querySelector(".projects__image"));
    const cTxt = box(cur.querySelector(".projects__content"));
    if (!pImg || !pTxt || !cImg || !cTxt || !pImg.height || !cImg.height) continue;
    const roomAbove = cImg.top - pTxt.bottom - CLEAR; // prev text vs cur photo
    const roomBelow = cTxt.top - pImg.bottom - CLEAR; // cur text vs prev photo
    const pull = Math.floor(Math.min(roomAbove, roomBelow));
    if (pull !== 0) cur.style.marginTop = `${-pull}px`;
  }
}

function init() {
  document.querySelectorAll(".projects:not(.projects--grid):not(.projects--list):not(.projects--mosaic)").forEach((section) => {
    let raf = 0;
    const run = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => layout(section)); };
    run();
    // Re-measure whenever a photo or title changes size (images loading, fonts, resize).
    // Margins don't change these elements' own sizes, so this can't loop.
    if ("ResizeObserver" in window) {
      const ro = new ResizeObserver(run);
      section.querySelectorAll(".projects__image, .projects__content").forEach((el) => ro.observe(el));
    } else {
      section.querySelectorAll(".projects__image img").forEach((img) => img.addEventListener("load", run));
    }
    window.addEventListener("resize", run);
    // MORE PROJECTS reveals hidden cards (theme.min.js) — re-measure after.
    section.querySelector(".projects__more-projects a")?.addEventListener("click", () => setTimeout(run, 50));
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
