/**
 * Central place for API base URL.
 * Same-origin when the site is served by FastAPI (recommended).
 * TODO: set window.__API_BASE__ in a config script if you deploy API separately.
 */
function apiUrl(path) {
  const base = typeof window.__API_BASE__ === "string" ? window.__API_BASE__.replace(/\/$/, "") : "";
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
