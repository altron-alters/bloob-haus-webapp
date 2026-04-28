/**
 * Musings Visualizer — Runtime (browser.js)
 *
 * Only active when infinite_scroll: false is set in the YAML fence.
 * theme.min.js initializes #musings-swiper with loop:true; this script
 * destroys that instance and reinitializes with loop:false so the carousel
 * stops at the last card instead of wrapping around.
 *
 * All other settings mirror theme.min.js exactly.
 */
window.addEventListener("load", () => {
  const container = document.querySelector("#musings-swiper");
  if (!container || container.dataset.noLoop !== "true") return;

  if (container.swiper) {
    container.swiper.destroy(true, true);
  }

  new Swiper("#musings-swiper", {
    direction: "vertical",
    slidesPerView: "auto",
    spaceBetween: 30,
    centeredSlides: true,
    freeMode: true,
    loop: false,
    mousewheel: { forceToAxis: true, releaseOnEdges: true },
    breakpoints: {
      1366: { spaceBetween: 32 },
      2560: { spaceBetween: 60 },
    },
  });
});
