(function () {
  const mount = document.getElementById("news-mount");
  if (!mount) return;

  mount.innerHTML = '<p class="status-msg">Жаңалықтар жүктелуде…</p>';

  fetch(apiUrl("/news"))
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((payload) => {
      // TODO: connect real news API here — map provider fields to headline, summary, published_at, category, image_url
      const items = payload.items || [];
      mount.innerHTML = "";
      if (!items.length) {
        mount.innerHTML = '<p class="status-msg">Әзірге мақалалар жоқ.</p>';
        return;
      }
      const grid = document.createElement("div");
      grid.className = "grid news-grid";
      
      items.forEach((n) => {
        const card = document.createElement("article");
        card.className = "card news-card";

        const imageHtml = n.image_url
          ? `<img src="${escapeHtml(n.image_url)}" alt="${escapeHtml(n.headline || "")}" class="card__image news-card__image">`
          : '<div class="news-card__image news-card__image--empty">Сурет жоқ</div>';

        card.innerHTML = `
          <div class="news-card__accent"></div>
          ${imageHtml}
          <div class="card__content">
            <div class="card__meta">${escapeHtml(n.category || "Жаңалық")} · ${escapeHtml(n.published_at || "Бүгін")}</div>
            <h2 class="card__title">${escapeHtml(n.headline || "Атаусыз")}</h2>
            <p class="card__body">${escapeHtml(n.summary || "")}</p>
          </div>
        `;
        grid.appendChild(card);
      });
      mount.appendChild(grid);
    })
    .catch(() => {
      mount.innerHTML =
        '<p class="status-msg error">Жаңалықтар жүктелмеді. API немесе желіні тексеріңіз.</p>';
    });
})();

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}