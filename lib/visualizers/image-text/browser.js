/**
 * image-text — runtime: starts the slow Ken Burns zoom (zoom=slowly-in / slowly-out)
 * when the image scrolls into view, so visitors see it from the start.
 * Without JS the CSS animation simply runs from page load.
 */
import { onView } from "../_utils/on-view.js";

const sections = document.querySelectorAll(".image-text[data-zoom]");
sections.forEach((s) => s.classList.add("image-text--zoom-waiting"));
onView(sections, (s) => s.classList.remove("image-text--zoom-waiting"), { threshold: 0.25 });
