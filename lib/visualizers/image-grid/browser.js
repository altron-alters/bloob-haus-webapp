/**
 * image-grid — runtime: team photos fade in and grow from slightly smaller once they
 * are in view AND loaded (so they never pop in from white). Staggered per row.
 * Without JS the photos are just visible (the hidden start state needs .team--reveal).
 */
import { onView } from "../_utils/on-view.js";

document.querySelectorAll(".team").forEach((team) => {
  const imgs = Array.from(team.querySelectorAll(".team__member-image"));
  if (!imgs.length) return;
  team.classList.add("team--reveal");
  imgs.forEach((img, i) => {
    img.style.transitionDelay = `${(i % 2) * 120}ms`;
    const show = () => img.classList.add("is-shown");
    onView([img], () => {
      if (img.complete && img.naturalWidth) show();
      else {
        img.addEventListener("load", show, { once: true });
        img.addEventListener("error", show, { once: true });
      }
    });
  });
});
