/**
 * More Projects carousel — project pages only (layouts/project.njk).
 *
 * Leon, 2026-11-03:
 *  - the first image sat flush against the window edge → the slides now start
 *    under the "More Projects" title (and end the same distance from the right);
 *  - moving the cursor to the right should start the carousel sliding → an edge
 *    glide: in the right quarter it glides forward, faster nearer the edge; in
 *    the left quarter it glides back; in the middle it holds still.
 * (The 3:2 image shape is CSS, in main.css.)
 *
 * theme.min.js creates this Swiper on jQuery ready. Per the browser.js ownership
 * convention (docs/architecture/visualizers.md) this script DESTROYS that
 * instance and re-initialises with the full config, on window load, which always
 * fires after jQuery ready. Same breakpoints as theme.min.js, except:
 *   loop: false   a loop would show the last slide in the left margin
 *   slidesOffsetBefore / After   the title's distance from the carousel's edge
 *   768px: 2.5 slides (was 1.63) so 3:2 pictures keep a steady size
 *
 * Off for touch screens (no hover) and for prefers-reduced-motion.
 * Guarded by tests/alter-engineers-layout.test.js → "AE More Projects carousel".
 */
(function () {
  var EDGE = 0.25;      // width of each hover zone, as a share of the carousel
  var MAX_SPEED = 700;  // px per second at the very edge

  /** Glide velocity for a cursor at `rel` (0 = left edge, 1 = right edge). */
  function edgeVelocity(rel) {
    if (rel > 1 - EDGE) return -MAX_SPEED * Math.min(1, (rel - (1 - EDGE)) / EDGE);
    if (rel < EDGE) return MAX_SPEED * Math.min(1, (EDGE - rel) / EDGE);
    return 0;
  }

  function attachEdgeGlide(el, swiper) {
    var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!canHover || reduced) return;

    var velocity = 0;
    var last = 0;
    var frame = 0;

    function step(now) {
      if (!velocity || swiper.destroyed) { frame = 0; return; }
      var dt = last ? Math.min(50, now - last) : 16;
      last = now;
      if (swiper.touchEventsData && swiper.touchEventsData.isTouched) {
        frame = requestAnimationFrame(step); // the visitor is dragging; let them
        return;
      }
      var lo = swiper.maxTranslate();
      var hi = swiper.minTranslate();
      var t = Math.max(lo, Math.min(hi, swiper.getTranslate() + (velocity * dt) / 1000));
      swiper.setTransition(0);
      swiper.setTranslate(t);
      swiper.updateProgress(t);
      swiper.updateActiveIndex();
      swiper.updateSlidesClasses();
      if (t === lo || t === hi) { frame = 0; return; } // reached an end
      frame = requestAnimationFrame(step);
    }

    function setVelocity(v) {
      velocity = v;
      if (velocity && !frame) {
        last = 0;
        frame = requestAnimationFrame(step);
      }
    }

    el.addEventListener("mousemove", function (e) {
      var r = el.getBoundingClientRect();
      setVelocity(edgeVelocity((e.clientX - r.left) / r.width));
    });
    el.addEventListener("mouseleave", function () { setVelocity(0); });
  }

  function init() {
    var section = document.querySelector(".more-projects");
    if (!section || typeof Swiper === "undefined") return;
    var el = section.querySelector(".articles__repeater");
    if (!el) return;
    if (el.swiper) el.swiper.destroy(true, true);

    var title = section.querySelector(".articles__main-title") || section.querySelector(".articles__top-section");
    function offset() {
      return Math.max(0, Math.round(title.getBoundingClientRect().left - el.getBoundingClientRect().left));
    }

    var swiper = new Swiper(el, {
      grabCursor: true,
      speed: 500,
      loop: false,
      spaceBetween: 10,
      slidesPerView: 1.6,
      slidesOffsetBefore: offset(),
      slidesOffsetAfter: offset(),
      navigation: {
        nextEl: section.querySelector(".articles__next-button"),
        prevEl: section.querySelector(".articles__prev-button"),
      },
      breakpoints: {
        // theme.min.js has 1.63 here; with 3:2 pictures that made them ~480px
        // tall just below 1366px and ~340px just above. 2.5 keeps them steady.
        768: { slidesPerView: 2.5, spaceBetween: 40 },
        1366: { slidesPerView: 2.46, spaceBetween: 130 },
        2560: { slidesPerView: 2.45, spaceBetween: 248 },
      },
      on: {
        // the title moves with the site gutters, so re-measure before Swiper does
        beforeResize: function (s) {
          var o = offset();
          s.params.slidesOffsetBefore = o;
          s.params.slidesOffsetAfter = o;
        },
      },
    });

    attachEdgeGlide(el, swiper);
    el.dataset.aeCarousel = "ready";
  }

  if (document.readyState === "complete") init();
  else window.addEventListener("load", init);
})();
