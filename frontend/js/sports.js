(function () {
  const mount = document.getElementById("sports-mount");
  const searchInput = document.getElementById("sports-search");
  const categorySelect = document.getElementById("sports-category");
  if (!mount) return;

  mount.innerHTML = '<p class="status-msg">Спорт түрлері жүктелуде…</p>';

  fetch(apiUrl("/sports"))
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((data) => {
      const items = data.items || [];
      mount.innerHTML = "";

      if (!items.length) {
        mount.innerHTML = '<p class="status-msg">Көрсетуге спорт түрі жоқ.</p>';
        return;
      }

      fillCategories(items, categorySelect);
      render(items, mount, searchInput, categorySelect);

      if (searchInput) {
        searchInput.addEventListener("input", () => {
          render(items, mount, searchInput, categorySelect);
        });
      }

      if (categorySelect) {
        categorySelect.addEventListener("change", () => {
          render(items, mount, searchInput, categorySelect);
        });
      }
    })
    .catch(() => {
      mount.innerHTML =
        '<p class="status-msg error">Спорт түрлері жүктелмеді. Backend іске қосулы ма?</p>';
    });
})();

function render(items, mount, searchInput, categorySelect) {
  const query = (searchInput?.value || "").trim().toLowerCase();
  const selectedCategory = (categorySelect?.value || "").trim().toLowerCase();

  const filtered = items.filter((s) => {
    const title = String(s.title || "").toLowerCase();
    const tags = (s.tags || []).map((t) => String(t).toLowerCase());
    const matchesQuery = !query || title.includes(query) || tags.some((t) => t.includes(query));
    const matchesCategory = !selectedCategory || tags.includes(selectedCategory);
    return matchesQuery && matchesCategory;
  });

  mount.innerHTML = "";
  if (!filtered.length) {
    mount.innerHTML = '<p class="status-msg">Сүзгі бойынша ештеңе табылмады.</p>';
    return;
  }

  const grid = document.createElement("div");
  grid.className = "grid";

  filtered.forEach((s) => {
    const card = document.createElement("article");
    card.className = "card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `${s.title || "спорт"} туралы толық ақпаратты ашу`);

    const imageUrl = s.image_url || s.image || s.imageUrl || "";
    const imageHtml = imageUrl
      ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(s.title || "Спорт")}" class="card__image">`
      : '<div class="card__image card__image--placeholder">Фото жоқ</div>';

    const icon = s.icon ? `<span aria-hidden="true" style="font-size:2rem; display:block; margin-bottom:0.5rem">${s.icon}</span>` : "";
    const tags = (s.tags || []).map((t) => `<span class="tag">${escapeHtml(String(t))}</span>`).join("");

    card.innerHTML = `
      ${imageHtml}
      ${icon}
      <h2 class="card__title">${escapeHtml(s.title || "Спорт")}</h2>
      <p class="card__body">${escapeHtml(s.description || "")}</p>
      ${tags ? `<div class="tags">${tags}</div>` : ""}
    `;

    const detailUrl = `/sport-detail.html?id=${encodeURIComponent(String(s.id || ""))}`;
    card.addEventListener("click", () => {
      window.location.href = detailUrl;
    });

    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        window.location.href = detailUrl;
      }
    });

    grid.appendChild(card);
  });

  mount.appendChild(grid);
}

function fillCategories(items, categorySelect) {
  if (!categorySelect) return;
  const unique = new Set();
  items.forEach((s) => {
    (s.tags || []).forEach((tag) => unique.add(String(tag)));
  });
  const sorted = Array.from(unique).sort((a, b) => a.localeCompare(b, "ru"));
  sorted.forEach((tag) => {
    const option = document.createElement("option");
    option.value = tag;
    option.textContent = tag;
    categorySelect.appendChild(option);
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}