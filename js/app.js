/* ============================================================
   APP — bootstrap, search realtime, theme toggle, nav handlers
   ============================================================ */

const App = {

  searchDebounceTimer: null,

  init() {
    document.getElementById("year").textContent = new Date().getFullYear();
    this.initTheme();
    this.initSearch();
    this.initMobileNav();
    this.initGlobalLinkHandler();
    this.initContact();
    this.registerRoutes();
    Router.init();
  },

  /* ---------------- THEME ---------------- */
  initTheme() {
    const saved = Storage.getTheme();
    document.documentElement.setAttribute("data-theme", saved);
    this.updateThemeIcon(saved);

    document.getElementById("themeToggle").addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "dark";
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      Storage.setTheme(next);
      this.updateThemeIcon(next);
    });
  },
  updateThemeIcon(theme) {
    document.getElementById("themeToggle").textContent = theme === "dark" ? "🌙" : "☀️";
  },

  /* ---------------- MOBILE NAV ---------------- */
  initMobileNav() {
    const menuBtn = document.getElementById("mobileMenuBtn");
    const mobileNav = document.getElementById("mobileNav");
    menuBtn.addEventListener("click", () => mobileNav.classList.toggle("show"));

    mobileNav.querySelectorAll("a").forEach(a => {
      a.addEventListener("click", () => mobileNav.classList.remove("show"));
    });

    const searchBtn = document.getElementById("mobileSearchBtn");
    const searchWrap = document.getElementById("searchWrap");
    searchBtn.addEventListener("click", () => {
      searchWrap.classList.toggle("mobile-show");
      if (searchWrap.classList.contains("mobile-show")) {
        document.getElementById("searchInput").focus();
      }
    });
  },

  /* ---------------- GLOBAL LINK HANDLER (close menus on nav) ---------------- */
  initGlobalLinkHandler() {
    document.addEventListener("click", (e) => {
      const link = e.target.closest("[data-link]");
      if (link) {
        document.getElementById("mobileNav").classList.remove("show");
        document.getElementById("searchWrap").classList.remove("mobile-show");
        document.getElementById("searchResults").classList.remove("show");
      }
    });
  },

  /* ---------------- SEARCH REALTIME ---------------- */
  initSearch() {
    const input = document.getElementById("searchInput");
    const wrap = document.getElementById("searchWrap");
    const resultsBox = document.getElementById("searchResults");
    const clearBtn = document.getElementById("searchClear");

    input.addEventListener("input", () => {
      const query = input.value.trim();
      wrap.classList.toggle("has-value", query.length > 0);

      clearTimeout(this.searchDebounceTimer);
      if (!query) {
        resultsBox.classList.remove("show");
        resultsBox.innerHTML = "";
        return;
      }

      this.searchDebounceTimer = setTimeout(() => this.runSearch(query), 280);
    });

    clearBtn.addEventListener("click", () => {
      input.value = "";
      wrap.classList.remove("has-value");
      resultsBox.classList.remove("show");
      resultsBox.innerHTML = "";
      input.focus();
    });

    document.addEventListener("click", (e) => {
      if (!wrap.contains(e.target)) {
        resultsBox.classList.remove("show");
      }
    });

    input.addEventListener("focus", () => {
      if (input.value.trim() && resultsBox.innerHTML) {
        resultsBox.classList.add("show");
      }
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const query = input.value.trim();
        if (!query) return;
        e.preventDefault();
        resultsBox.classList.remove("show");
        location.hash = `#/search/${encodeURIComponent(query)}`;
      }
    });
  },

  async runSearch(query) {
    const resultsBox = document.getElementById("searchResults");
    resultsBox.classList.add("show");
    resultsBox.innerHTML = `<div class="search-empty"><div class="spinner" style="margin:0 auto;"></div></div>`;

    try {
      // Try dedicated search endpoint first
      const apiResult = await Api.search(query);
      let items, total;

      if (apiResult) {
        items = apiResult.items;
        total = apiResult.total;
      } else {
        // Fallback: filter from cached new-anime list by title
        const list = await Pages.ensureNewListCache();
        const q = query.toLowerCase();
        items = list.filter(a => a.title.toLowerCase().includes(q));
        total = items.length;
      }

      if (!items.length) {
        resultsBox.innerHTML = `<div class="search-empty">Tidak ada hasil untuk "${Components.escapeHtml(query)}"</div>`;
        return;
      }

      const shown = items.slice(0, 8);
      const seeAllLink = total > shown.length
        ? `<a href="#/search/${encodeURIComponent(query)}" data-link class="search-see-all">Lihat semua ${total} hasil &rarr;</a>`
        : "";

      resultsBox.innerHTML = shown.map(a => `
        <a href="#/anime/${encodeURIComponent(a.url)}" data-link class="search-result-item">
          <img src="${Components.escapeHtml(a.cover)}" alt="" onerror="this.src='${Components.placeholderImg()}'">
          <span class="sri-title">${Components.escapeHtml(a.title)}</span>
        </a>
      `).join("") + seeAllLink;

    } catch (err) {
      resultsBox.innerHTML = `<div class="search-empty">Gagal memuat hasil pencarian.</div>`;
    }
  },

  /* ---------------- BOOKMARK BUTTON BINDING (used after grid render) ---------------- */
  bindBookmarkButtons() {
    document.querySelectorAll("[data-bookmark]").forEach(btn => {
      // avoid double-binding
      if (btn.dataset.bound) return;
      btn.dataset.bound = "1";

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const url = btn.dataset.bookmark;
        const card = btn.closest(".anime-card");
        const title = card.querySelector(".anime-card-title")?.textContent || "";
        const cover = card.querySelector("img")?.src || "";

        const isNow = Storage.toggleBookmark({ url, title, cover });
        btn.classList.toggle("active", isNow);
        btn.textContent = isNow ? "★" : "☆";
        Components.toast(isNow ? "Ditambahkan ke bookmark" : "Dihapus dari bookmark");
      });
    });
  },

  /* ---------------- CONTACT MODAL ---------------- */
  initContact() {
    const overlay  = document.getElementById("contactModalOverlay");
    const closeBtn = document.getElementById("contactModalClose");
    const navBtn   = document.getElementById("contactNavBtn");
    const mobileBtn= document.getElementById("contactMobileBtn");

    const openModal = (e) => {
      e && e.preventDefault();
      document.getElementById("mobileNav").classList.remove("show");
      overlay.classList.add("open");
      document.body.style.overflow = "hidden";
      this._loadContactData();
    };

    const closeModal = () => {
      overlay.classList.remove("open");
      document.body.style.overflow = "";
    };

    navBtn.addEventListener("click", openModal);
    mobileBtn.addEventListener("click", openModal);
    closeBtn.addEventListener("click", closeModal);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
  },

  async _loadContactData() {
    const container = document.getElementById("contactCards");
    const subtitle  = document.getElementById("contactSubtitle");

    // Already loaded
    if (container.dataset.loaded) return;

    container.innerHTML = `<div style="text-align:center;padding:24px 0;color:var(--text-muted)"><div class="spinner" style="margin:0 auto 10px"></div>Memuat data tim...</div>`;

    try {
      const res  = await fetch("data/contact.json");
      const data = await res.json();

      subtitle.textContent = data.tagline || "";

      // WhatsApp SVG favicon inline
      const waSvg = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;

      container.dataset.loaded = "1";
      container.innerHTML = data.team.map(member => `
        <div class="contact-card">
          <div class="contact-avatar">${member.avatar || "👤"}</div>
          <div class="contact-info">
            <div class="contact-role">${member.role}</div>
            <div class="contact-name">${member.name}</div>
            <div class="contact-handle">${member.handle}</div>
          </div>
          ${member.wa ? `
          <a class="contact-wa-btn"
             href="https://wa.me/${member.wa}"
             target="_blank" rel="noopener noreferrer"
             title="Chat via WhatsApp">
            ${waSvg} WA
          </a>` : ""}
        </div>
      `).join("");

    } catch (err) {
      container.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted)">Gagal memuat data kontak.</div>`;
    }
  },

  /* ---------------- ROUTES ---------------- */
  registerRoutes() {
    Router.add("/home", () => Pages.home());
    Router.add("/movies", () => Pages.movies());
    Router.add("/list/:type", (params) => Pages.listAll(params));
    Router.add("/search/:query", (params) => Pages.search(params));
    Router.add("/anime/:slug", (params) => Pages.detail(params));
    Router.add("/watch/:episodeUrl", (params) => {
      const queryParams = new URLSearchParams(location.hash.split("?")[1] || "");
      return Pages.watch(params, queryParams);
    });
    Router.add("/genres", () => Pages.genres({ genreName: null }));
    Router.add("/genres/:genreName", (params) => Pages.genres(params));
    Router.add("/bookmarks", () => Pages.bookmarks());
    Router.add("/history", () => Pages.history());
  },
};

App.init();
