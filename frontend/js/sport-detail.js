(function () {
  const mount = document.getElementById("sport-detail-mount");
  if (!mount) return;

  const params = new URLSearchParams(window.location.search);
  const sportId = params.get("id") || "";

  if (!sportId) {
    mount.innerHTML = '<p class="status-msg error">Спорт идентификаторы көрсетілмеген.</p>';
    return;
  }

  fetch(apiUrl("/sports"))
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((data) => {
      const items = data.items || [];
      const sport = items.find((item) => String(item.id) === sportId);

      if (!sport) {
        mount.innerHTML = '<p class="status-msg error">Спорт түрі табылмады.</p>';
        return;
      }

      const title = sport.title || "Спорт";
      const imageUrl = sport.image_url || sport.image || sport.imageUrl || "";
      const shortText = sport.description || "Сипаттама әлі қосылмаған.";
      const longText =
        sport.details ||
        sport.full_description ||
        sport.long_description ||
        "Қосымша ақпарат әлі жоқ. sports.json файлына details/full_description/long_description өрістерін қосыңыз.";
      const tags = (sport.tags || [])
        .map((tag) => `<span class="tag">${escapeHtml(String(tag))}</span>`)
        .join("");

      mount.innerHTML = `
        <a href="/sports.html">← Спорт бөліміне оралу</a>
        <section class="sport-detail__hero">
          ${imageUrl ? `<img class="sport-detail__image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}">` : '<div class="card__image card__image--placeholder">Фото жоқ</div>'}
        </section>
        <section class="card sport-detail__content">
          <h1 class="page-title">${escapeHtml(title)}</h1>
          ${sport.icon ? `<p style="font-size:2rem;margin:0.25rem 0 0.75rem">${escapeHtml(sport.icon)}</p>` : ""}
          <p class="card__body">${escapeHtml(shortText)}</p>
          ${tags ? `<div class="tags">${tags}</div>` : ""}
          <p class="sport-detail__long">${escapeHtml(longText)}</p>
        </section>
      `;
    })
    .catch(() => {
      mount.innerHTML = '<p class="status-msg error">Спорт туралы ақпарат жүктелмеді.</p>';
    });
})();

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
