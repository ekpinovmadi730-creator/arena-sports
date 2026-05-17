/**
 * Navbar scroll state + scroll-triggered reveal for news / training list cards.
 * Vanilla JS only; runs after DOM (and nav injection) is ready.
 */
(function () {
  const SCROLL_NAV_CLASS = "is-scrolled";
  const NAV_SCROLL_PX = 10;

  function setupNavScroll() {
    const nav = document.querySelector(".site-nav") || document.querySelector("body > nav");
    if (!nav) return;

    function onScroll() {
      nav.classList.toggle(SCROLL_NAV_CLASS, window.scrollY > NAV_SCROLL_PX);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function setupScrollReveal() {
    const configs = [
      { root: "#news-mount", selector: ".news-card" },
      { root: "#training-mount", selector: ".training-grid .training-card" },
    ];

    const io = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        });
      },
      { root: null, rootMargin: "0px 0px -8% 0px", threshold: 0.06 }
    );

    configs.forEach(({ root: rootSel, selector }) => {
      const root = document.querySelector(rootSel);
      if (!root) return;

      function bindNewCards() {
        root.querySelectorAll(selector).forEach((el) => {
          if (el.dataset.revealBound === "1") return;
          el.dataset.revealBound = "1";
          io.observe(el);
        });
      }

      bindNewCards();
      const mo = new MutationObserver(bindNewCards);
      mo.observe(root, { childList: true, subtree: true });
    });
  }

  function setupBackToTop() {
    const btn = document.getElementById("back-to-top");
    if (!btn) return;

    const showAfterPx = 280;

    function onScroll() {
      btn.classList.toggle("is-visible", window.scrollY > showAfterPx);
    }

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function init() {
    setupNavScroll();
    setupScrollReveal();
    setupBackToTop();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
