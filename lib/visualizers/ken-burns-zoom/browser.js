/**
 * Ken Burns Zoom — Runtime (browser.js)
 *
 * Finds all .vis-ken-burns-zoom containers, loads the image,
 * and starts a KenBurnsEngine instance for each one.
 *
 * Engine is imported from engine.js (esbuild bundles both into
 * src/assets/js/visualizers/ken-burns-zoom.js at build time).
 *
 * See: lib/visualizers/ken-burns-zoom/schema.md — field reference
 * See: lib/visualizers/ken-burns-zoom/engine.js — animation core
 */

import { KenBurnsEngine } from "./engine.js";

function parseAspectRatio(str) {
  const parts = String(str || "16:9").split(":");
  return { arW: parseFloat(parts[0]) || 16, arH: parseFloat(parts[1]) || 9 };
}

function buildViewport(arW, arH) {
  const vp = document.createElement("div");
  vp.style.cssText = "position:relative;overflow:hidden;width:100%;";
  // Height set by engine on each frame via arW/arH; set initial ratio to avoid flash
  vp.style.height = (100 * arH / arW) + "%";
  return vp;
}

function initContainer(container) {
  let settings;
  try {
    settings = JSON.parse(container.dataset.kbzSettings || "{}");
  } catch {
    console.warn("[ken-burns-zoom] Could not parse data-kbz-settings");
    return;
  }

  const { arW, arH } = parseAspectRatio(settings.aspectRatio);

  // Resolve image path: treat as /media/<filename> if no leading slash
  let src = settings.image || "";
  if (src && !src.startsWith("/") && !src.startsWith("http")) {
    src = "/media/" + src;
  }

  const vp  = buildViewport(arW, arH);
  const img = new Image();
  img.alt   = "";
  img.style.cssText = "display:block;";

  container.appendChild(vp);
  vp.appendChild(img);

  img.onload = () => {
    const engine = new KenBurnsEngine(vp, img, {
      startRect:  settings.startRect,
      endRect:    settings.endRect,
      duration:   settings.duration,
      easing:     settings.easing,
      direction:  settings.direction,
      playback:   settings.playback,
      arW,
      arH,
    });
    engine.play();
  };

  img.onerror = () => {
    console.warn(`[ken-burns-zoom] Could not load image: ${src}`);
  };

  img.src = src;
}

document.querySelectorAll(".vis-ken-burns-zoom").forEach(initContainer);
