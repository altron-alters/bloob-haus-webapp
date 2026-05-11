/**
 * Folder Preview Visualizer — Runtime (browser.js)
 *
 * Fetches /graph.json and renders pages belonging to the specified folder.
 *
 * Settings (via code fence YAML, passed as data-fp-settings JSON):
 *   folder: explicit folder name (required when on root/homepage)
 *   sort:   alpha (default) | reverse-alpha | recent
 *   limit:  max number of pages to show
 *   style:  (default list) | slider-cards
 *   title:  section label shown above slider-cards (default "ARTICLES")
 *   id:     section id (for slider-cards, set by build-time transform)
 */

(function () {
  const containers = document.querySelectorAll(".folder-preview-visualizer");
  if (!containers.length) return;

  // Fallback folder detection from URL path (for folder index pages)
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const currentFolder = pathParts.length >= 1 ? pathParts[0] : null;

  fetch("/graph.json")
    .then(function (res) { return res.json(); })
    .then(function (graph) {
      const allNodes = graph.nodes || [];

      containers.forEach(function (container) {
        let settings = {};
        try {
          settings = JSON.parse(container.dataset.fpSettings || "{}");
        } catch (e) {}

        const folder = settings.folder || currentFolder;
        if (!folder) return;

        const limit = settings.limit ? parseInt(settings.limit, 10) : Infinity;
        const sort = settings.sort || "alpha";

        // Filter to pages in this folder (exclude current page, folder root, index pages,
        // and non-public statuses — unlisted pages are absent from graph.json entirely;
        // archived pages are present but excluded from listings)
        const folderIndexId = "/" + folder + "/";
        let pages = allNodes.filter(function (node) {
          return (
            node.section === folder &&
            node.type === "page" &&
            node.id !== window.location.pathname &&
            node.id !== folderIndexId &&
            !node.id.endsWith("/index/") &&
            node.website_status !== "archived"
          );
        });

        // Sort
        if (sort === "reverse-alpha" || sort === "recent") {
          pages.sort(function (a, b) {
            const ta = (a.title || "").toLowerCase();
            const tb = (b.title || "").toLowerCase();
            return tb.localeCompare(ta);
          });
        } else {
          pages.sort(function (a, b) {
            const ta = (a.title || "").toLowerCase();
            const tb = (b.title || "").toLowerCase();
            return ta.localeCompare(tb);
          });
        }

        if (isFinite(limit)) pages = pages.slice(0, limit);

        if (settings.style === "slider-cards") {
          renderSliderCards(container, pages, settings);
        } else {
          renderList(container, pages);
        }
      });
    })
    .catch(function (err) {
      console.warn("[folder-preview] Failed to load graph.json:", err);
    });

  function renderSliderCards(container, pages, settings) {
    const title = settings.title || "ARTICLES";

    if (!pages.length) {
      const empty = document.createElement("p");
      empty.className = "folder-preview__empty";
      empty.textContent = "No articles yet.";
      container.appendChild(empty);
      return;
    }

    const slides = pages
      .map(function (node) {
        const href = node.redirect || node.id;
        const externalAttr = node.redirect ? ' target="_blank" rel="noopener"' : '';

        const imgHtml = node.image
          ? `<a href="${href}"${externalAttr}><img class="articles__image" src="${node.image}" alt="${node.title || ""}" loading="lazy"></a>`
          : `<div class="articles__image articles__image--placeholder"></div>`;
        return `<div class="swiper-slide articles__content">
          ${imgHtml}
          <div class="articles__inner-content">
            <h3 class="articles__title">${node.title || ""}</h3>
          </div>
          <a href="${href}" class="articles__read-more button-1"${externalAttr}>READ MORE</a>
        </div>`;
      })
      .join("");

    container.innerHTML = `
      <div class="articles__top-section">
        <p class="label">${title}</p>
        <div class="swiper-nav">
          <div class="articles__prev-button"></div>
          <div class="articles__next-button"></div>
        </div>
      </div>
      <div class="swiper articles__repeater" id="articles-swiper">
        <div class="swiper-wrapper">${slides}</div>
      </div>`;

    // Initialize Swiper — may already be available or need to wait for load
    function initSwiper() {
      if (typeof Swiper === "undefined") return;
      new Swiper("#articles-swiper", {
        grabCursor: true,
        speed: 500,
        spaceBetween: 10,
        loop: pages.length > 1,
        slidesPerView: 1.6,
        navigation: {
          nextEl: ".articles__next-button",
          prevEl: ".articles__prev-button",
        },
        breakpoints: {
          768: { slidesPerView: 1.63, spaceBetween: 20 },
          1366: { slidesPerView: 2.46, spaceBetween: 130 },
          2560: { slidesPerView: 2.45, spaceBetween: 248 },
        },
      });
    }

    if (document.readyState === "complete") {
      initSwiper();
    } else {
      window.addEventListener("load", initSwiper);
    }
  }

  function renderList(container, pages) {
    if (!pages.length) {
      const empty = document.createElement("p");
      empty.className = "folder-preview__empty";
      empty.textContent = "Nothing here yet.";
      container.appendChild(empty);
      return;
    }

    const ul = document.createElement("ul");
    ul.className = "folder-preview__list";

    pages.forEach(function (node) {
      const li = document.createElement("li");
      li.className = "folder-preview__item";

      const a = document.createElement("a");
      a.href = node.id;
      a.className = "folder-preview__link";

      if (node.bloobIcon) {
        const icon = document.createElement("img");
        icon.src = node.bloobIcon;
        icon.className = "folder-preview__icon";
        icon.alt = "";
        icon.setAttribute("aria-hidden", "true");
        a.appendChild(icon);
      }

      const label = document.createElement("span");
      label.textContent = node.title || node.id;
      a.appendChild(label);

      li.appendChild(a);
      ul.appendChild(li);
    });

    container.appendChild(ul);
  }
})();
