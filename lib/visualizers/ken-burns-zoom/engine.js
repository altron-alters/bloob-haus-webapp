/**
 * Ken Burns Zoom — Shared Animation Engine
 *
 * Canonical animation core used by both:
 *   - lib/visualizers/ken-burns-zoom/browser.js  (ESM import, bundled by esbuild)
 *   - lib/magic-machines/ken-burns-zoom-builder/app/index.html
 *       (<script type="module"> sets window.KenBurnsEngine for inline scripts)
 *
 * Config shape (all rects are % of image natural dimensions):
 * {
 *   startRect:  { x, y, w, h },
 *   endRect:    { x, y, w, h },
 *   duration:   number,          // seconds
 *   easing:     'linear' | 'ease-in' | 'ease-out' | 'ease-in-out',
 *   direction:  'in' | 'out',    // 'in' = startRect→endRect, 'out' = reverse
 *   playback:   'loop' | 'hold' | 'bounce',
 *   arW:        number,          // output aspect ratio width units
 *   arH:        number,          // output aspect ratio height units
 * }
 */

const EASING = {
  "linear":      t => t,
  "ease-in":     t => t * t,
  "ease-out":    t => t * (2 - t),
  "ease-in-out": t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
};

export class KenBurnsEngine {
  /**
   * @param {HTMLElement} viewport  — overflow:hidden container sized to the output AR
   * @param {HTMLImageElement} img  — the image element (must already be loaded)
   * @param {object} config
   */
  constructor(viewport, img, config) {
    this._vp     = viewport;
    this._img    = img;
    this._cfg    = null;
    this._raf    = null;
    this._t      = 0;
    this._last   = null;
    this._playing = false;
    this._bounceForward = true;
    this._onTick = null;

    this.configure(config);

    img.style.position   = "absolute";
    img.style.top        = "0";
    img.style.left       = "0";
    img.style.willChange = "transform, width, height";
    img.draggable        = false;
  }

  configure(config) {
    this._cfg = Object.assign({
      startRect:  { x: 5,  y: 5,  w: 90, h: 90 },
      endRect:    { x: 25, y: 20, w: 50, h: 60 },
      duration:   8,
      easing:     "linear",
      direction:  "in",
      playback:   "loop",
      arW:        16,
      arH:        9,
    }, config);
    this._renderFrame(this._t);
  }

  play() {
    if (this._playing) return;
    this._playing = true;
    this._last    = null;
    this._raf     = requestAnimationFrame(ts => this._tick(ts));
  }

  pause() {
    this._playing = false;
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
  }

  seek(t) {
    this._t = Math.max(0, Math.min(1, t));
    this._renderFrame(this._t);
  }

  // Seek to a position in the full exported-video timeline (ratio ∈ [0,1]).
  // For bounce, 0→0.5 is the forward pass and 0.5→1 is the reverse pass.
  seekAbsolute(ratio) {
    const pb = this._cfg.playback;
    if (pb === 'bounce') {
      if (ratio < 0.5) { this._t = ratio * 2; this._bounceForward = true; }
      else             { this._t = (1 - ratio) * 2; this._bounceForward = false; }
    } else {
      this._t = Math.max(0, Math.min(1, ratio));
    }
    this._renderFrame(this._t);
  }

  reset() {
    this.pause();
    this._t = 0;
    this._bounceForward = true;
    this._renderFrame(0);
  }

  onTick(fn) { this._onTick = fn; }

  destroy() {
    this.pause();
    this._img.style.position   = "";
    this._img.style.top        = "";
    this._img.style.left       = "";
    this._img.style.willChange = "";
    this._img.style.transform  = "";
    this._img.style.width      = "";
    this._img.style.height     = "";
  }

  _tick(ts) {
    if (!this._playing) return;
    if (this._last === null) this._last = ts;
    const dt   = (ts - this._last) / 1000;
    this._last = ts;
    const step = dt / this._cfg.duration;
    const pb   = this._cfg.playback;

    if (pb === "loop") {
      this._t += step;
      if (this._t >= 1) this._t = 0;
    } else if (pb === "hold") {
      this._t = Math.min(1, this._t + step);
      if (this._t >= 1) { this._playing = false; }
    } else if (pb === "bounce") {
      this._t += this._bounceForward ? step : -step;
      if (this._t >= 1) { this._t = 1; this._bounceForward = false; }
      if (this._t <= 0) { this._t = 0; this._bounceForward = true;  }
    }

    this._renderFrame(this._t);
    if (this._onTick) this._onTick(this._t);
    if (this._playing) this._raf = requestAnimationFrame(ts => this._tick(ts));
  }

  _renderFrame(t) {
    const cfg  = this._cfg;
    const ease = EASING[cfg.easing] || EASING["linear"];
    const et   = ease(t);

    const rs = cfg.direction === "in" ? cfg.startRect : cfg.endRect;
    const re = cfg.direction === "in" ? cfg.endRect   : cfg.startRect;

    const rx = rs.x + (re.x - rs.x) * et;
    const ry = rs.y + (re.y - rs.y) * et;
    const rw = rs.w + (re.w - rs.w) * et;
    const rh = rs.h + (re.h - rs.h) * et;

    const vpW = this._vp.clientWidth;
    const vpH = vpW * (cfg.arH / cfg.arW);
    this._vp.style.height = vpH + "px";

    const iw = this._img.naturalWidth;
    const ih = this._img.naturalHeight;
    const scale = Math.min(
      vpW / (rw / 100 * iw),
      vpH / (rh / 100 * ih)
    );

    const imgW = iw * scale;
    const imgH = ih * scale;

    this._img.style.width     = imgW + "px";
    this._img.style.height    = imgH + "px";
    this._img.style.transform =
      `translate(${-(rx / 100 * imgW)}px, ${-(ry / 100 * imgH)}px)`;
  }
}

// Expose as window global when loaded as <script type="module"> (magic machine)
if (typeof window !== "undefined") window.KenBurnsEngine = KenBurnsEngine;
