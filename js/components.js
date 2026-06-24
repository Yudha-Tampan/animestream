/* ============================================================
   UI COMPONENTS — fungsi render yang dipakai berulang
   ============================================================ */

const Components = {

  escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },

  /* ---------------- TOAST ---------------- */
  toast(message) {
    const container = document.getElementById("toastContainer");
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => el.remove(), 2100);
  },

  /* ---------------- ANIME CARD ---------------- */
  animeCard(anime) {
    const bookmarked = Storage.isBookmarked(anime.url);
    return `
      <div class="anime-card" data-url="${this.escapeHtml(anime.url)}">
        <a href="#/anime/${encodeURIComponent(anime.url)}" data-link class="anime-card-link">
          <div class="anime-card-cover">
            ${anime.info ? `<span class="anime-card-badge">${this.escapeHtml(anime.info)}</span>` : ""}
            <img src="${this.escapeHtml(anime.cover)}" alt="${this.escapeHtml(anime.title)}" loading="lazy"
                 onerror="this.src='${this.placeholderImg()}'">
          </div>
        </a>
        <button class="anime-card-bookmark ${bookmarked ? "active" : ""}" data-bookmark="${this.escapeHtml(anime.url)}" aria-label="Bookmark">
          ${bookmarked ? "★" : "☆"}
        </button>
        <div class="anime-card-body">
          <a href="#/anime/${encodeURIComponent(anime.url)}" data-link>
            <div class="anime-card-title">${this.escapeHtml(anime.title)}</div>
          </a>
        </div>
      </div>
    `;
  },

  placeholderImg() {
    return "data:image/svg+xml," + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450"><rect width="100%" height="100%" fill="#1c1f29"/><text x="50%" y="50%" fill="#6b6f7a" font-size="18" text-anchor="middle" font-family="sans-serif">No Image</text></svg>`
    );
  },

  animeGrid(list) {
    if (!list.length) {
      return this.emptyState("📭", "Tidak ada anime ditemukan", "Coba kata kunci lain atau periksa kembali nanti.");
    }
    return `<div class="anime-grid">${list.map(a => this.animeCard(a)).join("")}</div>`;
  },

  newAnimeCard(anime) {
    const bookmarked = Storage.isBookmarked(anime.url);
    return `
      <div class="na-card" data-url="${this.escapeHtml(anime.url)}">
        <a href="#/anime/${encodeURIComponent(anime.url)}" data-link class="na-card-link">
          <div class="na-cover">
            <img src="${this.escapeHtml(anime.cover)}" alt="${this.escapeHtml(anime.title)}" loading="lazy"
                 onerror="this.src='${this.placeholderImg()}'">
            <span class="na-badge">Baru di Upload</span>
            <button class="na-bookmark ${bookmarked ? "active" : ""}" data-bookmark="${this.escapeHtml(anime.url)}" aria-label="Bookmark">
              ${bookmarked ? "\u2605" : "\u2606"}
            </button>
          </div>
          <div class="na-body">
            <div class="na-title">${this.escapeHtml(anime.title)}</div>
          </div>
        </a>
      </div>
    `;
  },

  newAnimeGrid(list) {
    if (!list.length) {
      return this.emptyState("\ud83d\udced", "Tidak ada anime ditemukan", "Coba kata kunci lain.");
    }
    return `<div class="na-grid">${list.map(a => this.newAnimeCard(a)).join("")}</div>`;
  },

  skeletonNewGrid(count = 6) {
    const card = `<div class="na-card-skeleton"><div class="skeleton na-skeleton-cover"></div><div class="skeleton" style="height:13px;width:70%;border-radius:6px;margin:10px 0 6px;"></div><div class="skeleton" style="height:11px;width:45%;border-radius:6px;margin-bottom:12px;"></div></div>`;
    return `<div class="na-grid">${card.repeat(count)}</div>`;
  },

  /* ---------------- HORIZONTAL SCROLL CARD ROW ---------------- */
  hScrollCard(anime) {
    const bookmarked = Storage.isBookmarked(anime.url);
    return `
      <div class="hsc-card" data-url="${this.escapeHtml(anime.url)}">
        <a href="#/anime/${encodeURIComponent(anime.url)}" data-link class="hsc-link">
          <div class="hsc-cover">
            <img src="${this.escapeHtml(anime.cover)}" alt="${this.escapeHtml(anime.title)}" loading="lazy"
                 onerror="this.src='${this.placeholderImg()}'">
            <span class="hsc-year-badge">${this.escapeHtml(anime.info || "2026")}</span>
            <span class="hsc-type-tag">SERIES</span>
          </div>
          <div class="hsc-title">${this.escapeHtml(anime.title)}</div>
        </a>
        <button class="hsc-bookmark ${bookmarked ? "active" : ""}" data-bookmark="${this.escapeHtml(anime.url)}" aria-label="Bookmark">
          ${bookmarked ? "\u2605" : "\u2606"}
        </button>
      </div>
    `;
  },

  hScrollCards(list) {
    if (!list.length) return this.emptyState("\ud83d\udced", "Tidak ada anime", "");
    return `<div class="hsc-track">${list.map(a => this.hScrollCard(a)).join("")}</div>`;
  },

  skeletonHScroll(count = 6) {
    const card = `<div class="hsc-card-skel"><div class="skeleton hsc-skel-cover"></div><div class="skeleton" style="height:12px;width:75%;border-radius:5px;margin:8px 0 4px;"></div><div class="skeleton" style="height:10px;width:50%;border-radius:5px;"></div></div>`;
    return `<div class="hsc-track">${card.repeat(count)}</div>`;
  },



  /* ---------------- SKELETON ---------------- */
  skeletonGrid(count = 10) {
    const card = `
      <div class="skeleton-card">
        <div class="skeleton skeleton-cover"></div>
        <div class="skeleton skeleton-line w60"></div>
        <div class="skeleton skeleton-line w40"></div>
      </div>`;
    return `<div class="anime-grid">${card.repeat(count)}</div>`;
  },

  skeletonDetail() {
    return `
      <div class="detail-hero">
        <div class="detail-hero-overlay" style="background:var(--bg-card);">
          <div class="skeleton detail-cover"></div>
          <div class="detail-info" style="width:100%;">
            <div class="skeleton skeleton-line" style="height:28px;width:50%;margin:0 0 16px 0;"></div>
            <div class="skeleton skeleton-line" style="width:80%;margin-bottom:10px;"></div>
            <div class="skeleton skeleton-line" style="width:70%;margin-bottom:10px;"></div>
            <div class="skeleton skeleton-line" style="width:90%;margin-bottom:10px;"></div>
          </div>
        </div>
      </div>`;
  },

  skeletonDetailNew() {
    return `
      <div class="dv2-hero" style="background:var(--bg-card);">
        <div class="dv2-hero-body">
          <div class="skeleton" style="height:14px;width:130px;border-radius:999px;margin-bottom:14px;"></div>
          <div class="skeleton" style="height:34px;width:65%;border-radius:8px;margin-bottom:12px;"></div>
          <div class="skeleton" style="height:14px;width:40%;border-radius:6px;margin-bottom:18px;"></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
            ${[80,90,100,80].map(w=>`<div class="skeleton" style="height:32px;width:${w}px;border-radius:999px;"></div>`).join("")}
          </div>
          <div style="display:flex;gap:8px;margin-top:10px;">
            <div class="skeleton" style="height:44px;width:160px;border-radius:999px;"></div>
            <div class="skeleton" style="height:44px;width:120px;border-radius:999px;"></div>
          </div>
        </div>
      </div>
      <div class="dv2-card"><div class="skeleton" style="height:80px;border-radius:8px;"></div></div>`;
  },

  centerLoader() {
    return `<div class="center-loader"><div class="spinner"></div></div>`;
  },

  /* ---------------- EMPTY / ERROR STATE ---------------- */
  emptyState(emoji, title, desc, actionHtml = "") {
    return `
      <div class="empty-state">
        <div class="emoji">${emoji}</div>
        <h3>${this.escapeHtml(title)}</h3>
        <p>${this.escapeHtml(desc)}</p>
        ${actionHtml}
      </div>`;
  },

  errorState(message, retryHash) {
    return this.emptyState(
      "⚠️",
      "Gagal memuat data",
      message || "Terjadi kesalahan saat mengambil data dari server.",
      retryHash ? `<a href="${retryHash}" data-link class="btn btn-primary">Coba Lagi</a>` : ""
    );
  },

  /* ---------------- GENRE BADGES ---------------- */
  genreBadges(genres) {
    if (!genres || !genres.length) return "";
    return `<div class="genre-badges">${genres.map(g =>
      `<a href="#/genres/${encodeURIComponent(g)}" data-link class="genre-badge">${this.escapeHtml(g)}</a>`
    ).join("")}</div>`;
  },

  /* ---------------- CAROUSEL ---------------- */
  carousel(list, idPrefix = "trending") {
    const slides = list.map((a, i) => `
      <div class="carousel-slide" style="background-image:url('${this.escapeHtml(a.cover)}')">
        <div class="carousel-info">
          <span class="carousel-badge">🔥 Trending</span>
          <h2 class="carousel-title">${this.escapeHtml(a.title)}</h2>
          <a href="#/anime/${encodeURIComponent(a.url)}" data-link class="carousel-cta">▶ Tonton Sekarang</a>
        </div>
      </div>
    `).join("");

    const dots = list.map((_, i) => `<button class="carousel-dot ${i === 0 ? "active" : ""}" data-idx="${i}"></button>`).join("");

    return `
      <div class="carousel" id="${idPrefix}Carousel">
        <div class="carousel-track" id="${idPrefix}CarouselTrack">${slides}</div>
        <button class="carousel-nav-btn prev" id="${idPrefix}CarouselPrev" aria-label="Sebelumnya">‹</button>
        <button class="carousel-nav-btn next" id="${idPrefix}CarouselNext" aria-label="Berikutnya">›</button>
        <div class="carousel-dots" id="${idPrefix}CarouselDots">${dots}</div>
      </div>
    `;
  },

  initCarousel(total, idPrefix = "trending") {
    let current = 0;
    const track = document.getElementById(`${idPrefix}CarouselTrack`);
    const dots = document.querySelectorAll(`#${idPrefix}CarouselDots .carousel-dot`);
    if (!track || !total) return;

    function go(idx) {
      current = (idx + total) % total;
      track.style.transform = `translateX(-${current * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle("active", i === current));
    }

    document.getElementById(`${idPrefix}CarouselPrev`)?.addEventListener("click", () => go(current - 1));
    document.getElementById(`${idPrefix}CarouselNext`)?.addEventListener("click", () => go(current + 1));
    dots.forEach((d, i) => d.addEventListener("click", () => go(i)));

    let timer = setInterval(() => go(current + 1), 5000);
    const carouselEl = document.getElementById(`${idPrefix}Carousel`);
    carouselEl?.addEventListener("mouseenter", () => clearInterval(timer));
    carouselEl?.addEventListener("mouseleave", () => { timer = setInterval(() => go(current + 1), 5000); });
  },
};
