/**
 * onView(elements, fn, options) — call fn(el) once, the first time each element
 * scrolls into view. Falls back to calling fn immediately without IntersectionObserver.
 * Browser-only helper, bundled into a shape's browser.js by esbuild.
 */
export function onView(elements, fn, { threshold = 0.15, rootMargin = "0px 0px -5% 0px" } = {}) {
  const els = Array.from(elements);
  if (!els.length) return;
  if (!("IntersectionObserver" in window)) {
    els.forEach(fn);
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        fn(e.target);
      }
    },
    { threshold, rootMargin },
  );
  els.forEach((el) => io.observe(el));
}
