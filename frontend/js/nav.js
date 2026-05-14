/**
 * Injects the shared top navbar once per page (MPA — no SPA).
 * Active link is derived from <body data-active-nav="...">.
 */
(function () {
  const active = document.body.dataset.activeNav || "home";

  const items = [
    { id: "home", label: "Басты бет", href: "/" },
    { id: "sports", label: "Спорт", href: "/sports.html" },
    { id: "news", label: "Жаңалықтар", href: "/news.html" },
    { id: "training", label: "Жаттығу", href: "/training.html" },
    { id: "chatbot", label: "Чат-бот", href: "/chatbot.html" },
  ];

  const root = document.getElementById("nav-root");
  if (!root) return;

  const linksHtml = items
    .map((item) => {
      const cls = item.id === active ? "is-active" : "";
      return `<li><a class="${cls}" href="${item.href}">${item.label}</a></li>`;
    })
    .join("");

  root.innerHTML = `
    <nav class="site-nav" aria-label="Main">
      <div class="site-nav__inner">
        <a class="site-nav__brand" href="/">Arena</a>
        <ul class="site-nav__links">${linksHtml}</ul>
      </div>
    </nav>
  `;
})();
