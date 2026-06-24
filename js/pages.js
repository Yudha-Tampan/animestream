/* ============================================================
   PAGES — render logic untuk setiap route
   ============================================================ */

const Pages = {

  _cachedNewList: null, // cache homepage list untuk dipakai fallback search & genre filter
  _cachedMovies: null,  // cache daftar movie

  async ensureNewListCache() {
    if (!this._cachedNewList) {
      this._cachedNewList = await Api.getNewAnime();
    }
    return this._cachedNewList;
  },

  async ensureMoviesCache() {
    if (!this._cachedMovies) {
      this._cachedMovies = await Api.getMovies();
    }
    return this._cachedMovies;
  },

  /* Ekstrak "judul inti" dari sebuah judul anime, dengan membuang penanda
     season/part/OVA/movie di akhir judul. Dipakai untuk mencari anime
     terkait (season lain, OVA, movie spin-off) lewat endpoint search.
     Contoh:
       "Tensei shitara Slime Datta Ken Season 3" -> "Tensei shitara Slime Datta Ken"
       "Yuuki Yuuna wa Yuusha de Aru: Washio Sumi no Shou 2 - Tamashii" -> "Yuuki Yuuna wa Yuusha de Aru"
       "Berserk: Ougon Jidai-hen III - Kourin" -> "Berserk"
  */
  extractBaseTitle(title) {
    if (!title) return "";
    let base = title;
    let afterColon = "";

    // Potong di pemisah ":" atau " - " pertama (anime multi-part sering pakai subtitle setelah itu)
    const splitMatch = base.match(/^(.*?)(?:\s*[:\-–]\s+)(.*)$/);
    if (splitMatch && splitMatch[1].trim().length >= 3) {
      base = splitMatch[1].trim();
      afterColon = splitMatch[2].trim();
    }

    // Buang penanda season/part/sequel umum di ekor judul
    const trailingPatterns = [
      /\s+(season|s)\s*\d+$/i,
      /\s+\d+(st|nd|rd|th)\s+season$/i,
      /\s+part\s*\d+$/i,
      /\s+(ova|ona|movie|special)s?$/i,
      /\s+\d+$/, // angka polos di akhir, misal "Berserk III" sudah ditangani romawi di bawah; ini utk angka biasa
      /\s+(i{1,3}|iv|v|vi{0,3}|ix|x)$/i, // angka romawi sederhana
    ];
    for (const re of trailingPatterns) {
      const stripped = base.replace(re, "").trim();
      if (stripped.length >= 3) base = stripped;
    }

    return { primary: base.trim(), secondary: afterColon };
  },

  /* ================= HOME ================= */
  async home() {
    const app = document.getElementById("app");
    app.innerHTML = `
      <section class="section">
        <div id="carouselSlot"><div class="carousel" style="display:flex;align-items:center;justify-content:center;"><div class="spinner"></div></div></div>
      </section>
      <section class="section hscroll-section">
        <div class="section-head">
          <div class="section-title"><span class="bar"></span> Anime Terbaru</div>
          <a href="#/list/new" data-link class="section-link">LIHAT SEMUA &rarr;</a>
        </div>
        <div id="newAnimeSlot" class="hscroll-track-wrap">${Components.skeletonHScroll(8)}</div>
      </section>
      <section class="section hscroll-section">
        <div class="section-head">
          <div class="section-title"><span class="bar"></span> Movie Terbaru</div>
          <a href="#/list/movies" data-link class="section-link">LIHAT SEMUA &rarr;</a>
        </div>
        <div id="movieSlot" class="hscroll-track-wrap">${Components.skeletonHScroll(8)}</div>
      </section>
    `;

    try {
      const list = await this.ensureNewListCache();

      // Carousel: take first 6 as "trending"
      const trending = list.slice(0, 6);
      document.getElementById("carouselSlot").innerHTML = Components.carousel(trending, "trending");
      Components.initCarousel(trending.length, "trending");

      // Horizontal scroll card row
      document.getElementById("newAnimeSlot").innerHTML = Components.hScrollCards(list);
      App.bindBookmarkButtons();

    } catch (err) {
      console.error(err);
      document.getElementById("newAnimeSlot").innerHTML = Components.errorState(err.message, "#/home");
      document.getElementById("carouselSlot").innerHTML = "";
    }

    try {
      const movies = await this.ensureMoviesCache();
      document.getElementById("movieSlot").innerHTML = Components.hScrollCards(movies);
      App.bindBookmarkButtons();
    } catch (err) {
      console.error(err);
      document.getElementById("movieSlot").innerHTML = Components.errorState(err.message, "#/home");
    }
  },

  /* ================= MOVIES (dedicated page, same look as home's new-anime section) ================= */
  async movies() {
    const app = document.getElementById("app");
    app.innerHTML = `
      <section class="section">
        <div id="movieCarouselSlot"><div class="carousel" style="display:flex;align-items:center;justify-content:center;"><div class="spinner"></div></div></div>
      </section>
      <section class="section hscroll-section">
        <div class="section-head">
          <div class="section-title"><span class="bar"></span> Movie Terbaru</div>
          <a href="#/list/movies" data-link class="section-link">LIHAT SEMUA &rarr;</a>
        </div>
        <div id="movieListSlot" class="hscroll-track-wrap">${Components.skeletonHScroll(8)}</div>
      </section>
    `;

    try {
      const list = await this.ensureMoviesCache();

      const trending = list.slice(0, 6);
      document.getElementById("movieCarouselSlot").innerHTML = Components.carousel(trending, "movie");
      Components.initCarousel(trending.length, "movie");

      document.getElementById("movieListSlot").innerHTML = Components.hScrollCards(list);
      App.bindBookmarkButtons();
    } catch (err) {
      console.error(err);
      document.getElementById("movieListSlot").innerHTML = Components.errorState(err.message, "#/movies");
      document.getElementById("movieCarouselSlot").innerHTML = "";
    }
  },

  /* ================= SEARCH RESULTS (full page) ================= */
  async search({ query }) {
    const app = document.getElementById("app");
    const decodedQuery = query; // router already decodeURIComponent's params

    app.innerHTML = `
      <section class="section">
        <div class="section-head">
          <div class="section-title"><span class="bar"></span> Hasil Pencarian: "${Components.escapeHtml(decodedQuery)}"</div>
          <span class="genre-count-badge" id="searchCount">Memuat...</span>
        </div>
        <div id="searchResultSlot">${Components.skeletonNewGrid(8)}</div>
      </section>
    `;

    try {
      const apiResult = await Api.search(decodedQuery);
      let items, total;

      if (apiResult) {
        items = apiResult.items;
        total = apiResult.total;
      } else {
        const list = await this.ensureNewListCache();
        const q = decodedQuery.toLowerCase();
        items = list.filter(a => a.title.toLowerCase().includes(q));
        total = items.length;
      }

      const countEl = document.getElementById("searchCount");
      if (countEl) countEl.textContent = `${total} Anime`;

      if (!items.length) {
        document.getElementById("searchResultSlot").innerHTML = Components.emptyState(
          "📭", "Tidak ada hasil", `Tidak ada anime yang cocok dengan "${decodedQuery}".`
        );
        return;
      }

      document.getElementById("searchResultSlot").innerHTML = Components.newAnimeGrid(items);
      App.bindBookmarkButtons();
    } catch (err) {
      console.error(err);
      document.getElementById("searchResultSlot").innerHTML = Components.errorState(
        err.message, `#/search/${encodeURIComponent(decodedQuery)}`
      );
    }
  },

  /* ================= LIHAT SEMUA (full grid, non-carousel) =================
     type: "new" -> semua anime terbaru, "movies" -> semua movie
  ============================================================================ */
  async listAll({ type }) {
    const app = document.getElementById("app");
    const isMovies = type === "movies";
    const pageTitle = isMovies ? "Semua Movie" : "Semua Anime Terbaru";

    app.innerHTML = `
      <section class="section">
        <div class="section-head">
          <div class="section-title"><span class="bar"></span> ${pageTitle}</div>
        </div>
        <div id="listAllSlot">${Components.skeletonNewGrid(12)}</div>
      </section>
    `;

    try {
      const list = isMovies ? await this.ensureMoviesCache() : await this.ensureNewListCache();
      document.getElementById("listAllSlot").innerHTML = Components.newAnimeGrid(list);
      App.bindBookmarkButtons();
    } catch (err) {
      console.error(err);
      document.getElementById("listAllSlot").innerHTML = Components.errorState(
        err.message, isMovies ? "#/list/movies" : "#/list/new"
      );
    }
  },

  /* ================= DETAIL ================= */
  async detail({ slug }) {
    const app = document.getElementById("app");
    app.innerHTML = `<div id="detailSlot" class="detail-loading-wrap">${Components.skeletonDetailNew()}</div>`;

    try {
      const anime = await Api.getDetail(slug);
      const bookmarked = Storage.isBookmarked(anime.url || slug);
      const animeUrl = anime.url || slug;
      const firstEpHref = anime.episodes.length
        ? `#/watch/${encodeURIComponent(anime.episodes[0].url)}?anime=${encodeURIComponent(animeUrl)}`
        : null;

      // Update schedule text from status
      const scheduleText = anime.status && anime.status !== "-"
        ? `Update ${Components.escapeHtml(anime.status)}`
        : "";

      document.getElementById("detailSlot").innerHTML = `
        <!-- HERO SECTION -->
        <div class="dv2-hero">
          <div class="dv2-hero-bg" style="background-image:url('${Components.escapeHtml(anime.cover)}')"></div>
          <div class="dv2-hero-gradient"></div>

          <!-- Top bar: back button -->
          <div class="dv2-topbar">
            <button class="dv2-back-btn" onclick="history.back()">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
          </div>

          <!-- Hero content overlay -->
          <div class="dv2-hero-body">
            ${scheduleText ? `<div class="dv2-schedule-badge">📅 ${scheduleText}</div>` : ""}
            <h1 class="dv2-title">${Components.escapeHtml(anime.title)}</h1>
            <p class="dv2-title-native">${Components.escapeHtml(anime.title)}</p>

            <!-- Meta pills -->
            <div class="dv2-meta-row">
              ${anime.rating && anime.rating !== "-" ? `<span class="dv2-meta-pill dv2-rating"><svg width="13" height="13" viewBox="0 0 24 24" fill="#f1c40f"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> ${Components.escapeHtml(anime.rating)}</span>` : ""}
              ${anime.studio && anime.studio !== "-" ? `<span class="dv2-meta-pill">${Components.escapeHtml(anime.studio)}</span>` : ""}
              ${anime.releaseDate && anime.releaseDate !== "-" ? `<span class="dv2-meta-pill">${Components.escapeHtml(anime.releaseDate)}</span>` : ""}
              ${anime.type && anime.type !== "-" ? `<span class="dv2-meta-pill">${Components.escapeHtml(anime.type)}</span>` : ""}
              <span class="dv2-meta-pill dv2-views">6.5K views</span>
            </div>

            <!-- Genre chips -->
            ${anime.genres.length ? `
            <div class="dv2-genre-row">
              ${anime.genres.map(g => `<a href="#/genres/${encodeURIComponent(g)}" data-link class="dv2-genre-chip">${Components.escapeHtml(g)}</a>`).join("")}
            </div>` : ""}

            <!-- Action buttons -->
            <div class="dv2-action-row">
              ${firstEpHref ? `<a href="${firstEpHref}" data-link class="dv2-btn-watch">Tonton Sekarang</a>` : ""}
              <button class="dv2-btn-subscribe ${bookmarked ? "subscribed" : ""}" id="detailBookmarkBtn">
                ${bookmarked ? "★ Tersimpan" : "Subscribe"}
              </button>
            </div>

            <!-- Type & schedule tags -->
            <div class="dv2-tag-row">
              ${anime.type && anime.type !== "-" ? `<span class="dv2-tag">${Components.escapeHtml(anime.type)}</span>` : ""}
              ${scheduleText ? `<span class="dv2-tag">${scheduleText}</span>` : ""}
            </div>
          </div>
        </div>

        <!-- SYNOPSIS -->
        <div class="dv2-card">
          <div class="dv2-section-head">
            <span class="dv2-section-title">Synopsis</span>
            <button class="dv2-read-more" id="synopsisToggle">Baca semua</button>
          </div>
          <p class="dv2-synopsis" id="synopsisText">${Components.escapeHtml(anime.synopsis)}</p>
        </div>

        <!-- EPISODE LIST -->
        <div class="dv2-card">
          <div class="dv2-section-head">
            <span class="dv2-section-title">Daftar Episode</span>
            <span class="dv2-ep-count">${anime.episodes.length} Episode</span>
          </div>
          <div class="dv2-episode-list">
            ${this.renderEpisodeListV2(anime.episodes, animeUrl)}
          </div>
        </div>

        <!-- RELATED ANIME (load from cache) -->
        <div class="dv2-card" id="relatedSection">
          <div class="dv2-section-head">
            <span class="dv2-section-title">Related Anime</span>
          </div>
          <div class="dv2-related-grid" id="relatedGrid">
            ${Components.skeletonGrid(4)}
          </div>
        </div>
      `;

      // Bookmark button
      document.getElementById("detailBookmarkBtn").addEventListener("click", (e) => {
        const isNow = Storage.toggleBookmark({ url: animeUrl, title: anime.title, cover: anime.cover });
        e.target.classList.toggle("subscribed", isNow);
        e.target.textContent = isNow ? "★ Tersimpan" : "Subscribe";
        Components.toast(isNow ? "Ditambahkan ke bookmark" : "Dihapus dari bookmark");
      });

      // Synopsis toggle
      const synText = document.getElementById("synopsisText");
      const synToggle = document.getElementById("synopsisToggle");
      let expanded = false;
      synText.classList.add("synopsis-clamp");
      synToggle.addEventListener("click", () => {
        expanded = !expanded;
        synText.classList.toggle("synopsis-clamp", !expanded);
        synToggle.textContent = expanded ? "Sembunyikan" : "Baca semua";
      });

      // Load related anime — cari berdasarkan judul inti (tanpa "Season 2", "OVA", dll)
      // supaya season/spin-off/movie dari anime yang sama ikut muncul.
      try {
        const { primary, secondary } = this.extractBaseTitle(anime.title);
        let related = [];

        if (primary) {
          const apiResult = await Api.search(primary);
          if (apiResult && apiResult.items.length) {
            related = apiResult.items.filter(a => a.url !== animeUrl);
          }
        }

        // Kalau judul punya bagian setelah ":" (misal "Tensura Nikki: Tensei shitara...")
        // dan hasil dari judul utama sedikit, coba juga cari dengan bagian itu —
        // sering kali itu nama waralaba utamanya.
        if (secondary && related.length < 4) {
          const apiResult2 = await Api.search(secondary);
          if (apiResult2 && apiResult2.items.length) {
            const extra = apiResult2.items.filter(a => a.url !== animeUrl);
            const seen = new Set(related.map(a => a.url));
            for (const item of extra) {
              if (!seen.has(item.url)) {
                related.push(item);
                seen.add(item.url);
              }
            }
          }
        }

        // Fallback: kalau search tidak tersedia / tidak ada hasil relevan, pakai cache anime terbaru
        if (!related.length) {
          const list = await this.ensureNewListCache();
          related = list.filter(a => a.url !== animeUrl);
        }

        if (!related.length) {
          document.getElementById("relatedSection").style.display = "none";
        } else {
          document.getElementById("relatedGrid").innerHTML = Components.animeGrid(related.slice(0, 8));
          App.bindBookmarkButtons();
        }
      } catch (_) {
        document.getElementById("relatedSection").style.display = "none";
      }

    } catch (err) {
      console.error(err);
      document.getElementById("detailSlot").innerHTML = Components.errorState(err.message, `#/anime/${encodeURIComponent(slug)}`);
    }
  },

  renderEpisodeListV2(episodes, animeUrl) {
    if (!episodes.length) {
      return Components.emptyState("📺", "Belum ada episode", "Episode akan tersedia segera.");
    }
    // show latest first (reverse)
    const reversed = [...episodes].reverse();
    return reversed.map(ep => {
      const watched = Storage.isEpisodeWatched(ep.url);
      return `<a href="#/watch/${encodeURIComponent(ep.url)}?anime=${encodeURIComponent(animeUrl)}" data-link
                  class="dv2-ep-item ${watched ? "watched" : ""}">
        <div class="dv2-ep-num">${ep.number}</div>
        <div class="dv2-ep-info">
          <div class="dv2-ep-title">${Components.escapeHtml(ep.title)}</div>
          ${ep.date ? `<div class="dv2-ep-date">${Components.escapeHtml(ep.date)}</div>` : ""}
        </div>
        <div class="dv2-ep-arrow">›</div>
        ${watched ? `<div class="dv2-ep-watched">✓</div>` : ""}
      </a>`;
    }).join("");
  },

  renderEpisodeList(episodes, animeUrl) {
    if (!episodes.length) {
      return Components.emptyState("📺", "Belum ada episode", "Episode akan tersedia segera.");
    }
    return `<div class="episode-list">${episodes.map(ep => {
      const watched = Storage.isEpisodeWatched(ep.url);
      return `<a href="#/watch/${encodeURIComponent(ep.url)}?anime=${encodeURIComponent(animeUrl)}" data-link
                  class="episode-pill ${watched ? "watched" : ""}">${Components.escapeHtml(ep.title)}</a>`;
    }).join("")}</div>`;
  },



  /* ================= WATCH (EPISODE PLAYER) ================= */
  async watch({ episodeUrl }, queryParams) {
    const app = document.getElementById("app");
    const animeUrl = queryParams.get("anime") || "";
    let reso = queryParams.get("reso") || "720p";

    app.innerHTML = `
      <div class="watch-layout-v2">
        <div class="player-wrap" id="playerWrap">
          <div class="player-overlay-msg"><div class="spinner"></div><span>Memuat video...</span></div>
        </div>

        <!-- Tab bar (hanya "Informasi" yang aktif/berfungsi) -->
        <div class="watch-tab-bar">
          <button class="watch-tab active" data-tab="info">Informasi</button>
          <button class="watch-tab" disabled title="Tidak tersedia">Komentar</button>
          <button class="watch-tab" disabled title="Tidak tersedia">Kreator</button>
          <button class="watch-tab" disabled title="Tidak tersedia">Chat</button>
        </div>

        <!-- Episode info card -->
        <div class="ep-info-card">
          <div class="ep-info-card-head">
            <div>
              <span class="ep-info-badge" id="epBadge">Episode</span>
              <div class="ep-info-title" id="epTitleSlot">Memuat...</div>
              <div class="ep-info-meta" id="epMetaSlot"></div>
            </div>
            <button class="ep-info-btn" id="epInfoBtn" aria-label="Info anime">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            </button>
          </div>

          <div class="ep-action-row">
            <button class="ep-like-btn" id="likeBtn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
              <span>Suka</span>
              <span class="ep-like-count" id="likeCount">0</span>
            </button>
            <div class="ep-secondary-actions">
              <select class="reso-select" id="resoSelect">
                <option value="360p">360p</option>
                <option value="480p">480p</option>
                <option value="720p" selected>720p</option>
                <option value="1080p">1080p</option>
                <option value="4K">4K</option>
              </select>
            </div>
          </div>
        </div>

        <div class="nav-ep-row">
          <a href="#" class="nav-ep-btn disabled" id="prevEpBtn">‹ Episode Sebelumnya</a>
          <a href="#/anime/${encodeURIComponent(animeUrl)}" data-link class="nav-ep-btn">📋 Semua Episode</a>
          <a href="#" class="nav-ep-btn disabled" id="nextEpBtn">Episode Berikutnya ›</a>
        </div>

        <!-- Daftar series -->
        <div class="series-card">
          <div class="series-card-head">
            <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-3px;margin-right:6px;"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>Daftar Series</span>
          </div>
          <div class="series-name-pill" id="seriesNamePill">Memuat...</div>
          <div class="series-ep-grid" id="sidePanel">${Components.centerLoader()}</div>
        </div>
      </div>

      <!-- Info modal (anime detail), dibuka lewat tombol ⓘ -->
      <div class="info-modal-overlay" id="infoModalOverlay">
        <div class="info-modal-sheet" id="infoModalSheet">
          <div class="info-modal-handle"></div>
          <button class="info-modal-close" id="infoModalClose" aria-label="Tutup">✕</button>
          <div id="infoModalBody"><div class="center-loader"><div class="spinner"></div></div></div>
        </div>
      </div>
    `;

    const resoSelect = document.getElementById("resoSelect");
    resoSelect.value = reso;

    // load anime detail for sidebar + prev/next + info modal (independent of episode call, runs in parallel)
    const detailPromise = animeUrl ? Api.getDetail(animeUrl).catch(() => null) : Promise.resolve(null);

    await this.loadEpisode(episodeUrl, reso, animeUrl); // also sets _lastServerReaction & refreshes reaction UI

    document.getElementById("resoSelect").addEventListener("change", (e) => {
      const newReso = e.target.value;
      location.hash = `#/watch/${encodeURIComponent(episodeUrl)}?anime=${encodeURIComponent(animeUrl)}&reso=${newReso}`;
    });

    document.getElementById("likeBtn").addEventListener("click", () => this.handleReaction(episodeUrl, "like"));

    // Info modal open/close
    const overlay = document.getElementById("infoModalOverlay");
    document.getElementById("epInfoBtn").addEventListener("click", () => {
      overlay.classList.add("show");
    });
    document.getElementById("infoModalClose").addEventListener("click", () => overlay.classList.remove("show"));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.classList.remove("show");
    });

    const animeDetail = await detailPromise;
    if (animeDetail) {
      this.renderSidePanel(animeDetail, episodeUrl, animeUrl);
      this.setupPrevNext(animeDetail, episodeUrl, animeUrl, reso);
      this.renderInfoModalBody(animeDetail);

      const seriesPill = document.getElementById("seriesNamePill");
      if (seriesPill) seriesPill.textContent = `${animeDetail.title} · ${animeDetail.episodes.length} ep`;

      // judul episode API stream tidak menyediakan field judul, jadi ambil dari daftar episode anime
      const currentEp = animeDetail.episodes.find(e => e.url === episodeUrl);
      const epBadge = document.getElementById("epBadge");
      const epMeta = document.getElementById("epMetaSlot");
      if (currentEp) {
        document.getElementById("epTitleSlot").textContent = currentEp.title;
        if (epBadge) epBadge.textContent = currentEp.title;
        if (epMeta) {
          const metaParts = [];
          if (animeDetail.duration && animeDetail.duration !== "-") metaParts.push(`⏱ ${Components.escapeHtml(animeDetail.duration)}`);
          if (animeDetail.rating && animeDetail.rating !== "-") metaParts.push(`★ ${Components.escapeHtml(animeDetail.rating)}`);
          if (animeDetail.status && animeDetail.status !== "-") metaParts.push(`${Components.escapeHtml(animeDetail.status)}`);
          epMeta.textContent = metaParts.join("  ·  ");
        }
      }
      Storage.addHistory({
        animeUrl: animeDetail.url || animeUrl,
        animeTitle: animeDetail.title,
        cover: animeDetail.cover,
        episodeUrl,
        episodeTitle: currentEp ? currentEp.title : "Episode",
      });
    } else {
      document.getElementById("sidePanel").innerHTML = Components.emptyState("📭", "Tidak tersedia", "Info anime tidak dapat dimuat.");
      document.getElementById("infoModalBody").innerHTML = Components.emptyState("📭", "Tidak tersedia", "Info anime tidak dapat dimuat.");
      const seriesPill = document.getElementById("seriesNamePill");
      if (seriesPill) seriesPill.textContent = "Info tidak tersedia";
    }
  },

  /* Isi modal info anime (judul, cover, rating, genre, sinopsis) - dibuka via tombol ⓘ */
  renderInfoModalBody(animeDetail) {
    const body = document.getElementById("infoModalBody");
    if (!body) return;
    body.innerHTML = `
      <div class="info-modal-top">
        <img class="info-modal-cover" src="${Components.escapeHtml(animeDetail.cover)}" alt="${Components.escapeHtml(animeDetail.title)}"
             onerror="this.src='${Components.placeholderImg()}'">
        <div>
          <div class="info-modal-title">${Components.escapeHtml(animeDetail.title)}</div>
          <div class="info-modal-pills">
            ${animeDetail.rating && animeDetail.rating !== "-" ? `<span class="info-modal-pill">★ ${Components.escapeHtml(animeDetail.rating)}</span>` : `<span class="info-modal-pill">★ N/A</span>`}
            ${animeDetail.status && animeDetail.status !== "-" ? `<span class="info-modal-pill">${Components.escapeHtml(animeDetail.status)}</span>` : ""}
          </div>
        </div>
      </div>
      ${animeDetail.genres.length ? `
        <div class="info-modal-section-label">Genre</div>
        <div class="info-modal-genres">
          ${animeDetail.genres.map(g => `<a href="#/genres/${encodeURIComponent(g)}" data-link class="info-modal-genre-chip">${Components.escapeHtml(g)}</a>`).join("")}
        </div>` : ""}
      <div class="info-modal-section-label">Sinopsis</div>
      <p class="info-modal-synopsis">${Components.escapeHtml(animeDetail.synopsis)}</p>
      <a href="#/anime/${encodeURIComponent(animeDetail.url)}" data-link class="info-modal-detail-link">Lihat Halaman Anime &rarr;</a>
    `;
  },

  async loadEpisode(episodeUrl, reso, animeUrl) {
    const playerWrap = document.getElementById("playerWrap");
    const epTitleSlot = document.getElementById("epTitleSlot");
    playerWrap.innerHTML = `<div class="player-overlay-msg"><div class="spinner"></div><span>Memuat video (${reso})...</span></div>`;

    try {
      const ep = await Api.getEpisode(episodeUrl, reso);
      epTitleSlot.textContent = "Episode"; // akan diganti dengan judul lengkap setelah detail anime termuat

      // sesuaikan opsi resolusi dengan yang benar-benar tersedia dari server
      this.updateResoOptions(ep.availableReso, reso);

      // simpan like/dislike count terbaru dari server ke cache lokal supaya tetap konsisten antar halaman
      this._lastServerReaction = { likeCount: ep.likeCount, dislikeCount: ep.dislikeCount };
      this.refreshReactionUI(episodeUrl);

      const allSources = [ep.videoUrl, ...ep.mirrors.map(m => m.link)].filter(Boolean);

      if (allSources.length) {
        this.renderPlayerWithFallback(allSources, reso);
      } else {
        playerWrap.innerHTML = `<div class="player-overlay-msg">
            <span>⚠️ Sumber video resolusi ${Components.escapeHtml(reso)} tidak tersedia.</span>
            <span style="font-size:.8rem;opacity:.7;">Coba pilih resolusi lain.</span>
          </div>`;
      }
    } catch (err) {
      console.error(err);
      playerWrap.innerHTML = `<div class="player-overlay-msg">
          <span>⚠️ Gagal memuat video.</span>
          <span style="font-size:.8rem;opacity:.7;">${Components.escapeHtml(err.message)}</span>
        </div>`;
    }
  },

  /* Render video, dan otomatis coba mirror berikutnya kalau sumber pertama gagal load
     (beberapa provider sering down/expired, atau file baru saja diupload dan
     belum sepenuhnya tersedia di storage/CDN). Pakai video.src langsung (bukan
     <source> di dalam <video>) karena event "error" lebih konsisten ter-trigger
     lintas browser dengan cara ini. */
  renderPlayerWithFallback(sources, reso) {
    const playerWrap = document.getElementById("playerWrap");
    let idx = 0;

    playerWrap.innerHTML = `<video controls autoplay playsinline crossorigin="anonymous" referrerpolicy="no-referrer" id="videoPlayer"></video>`;
    const videoEl = document.getElementById("videoPlayer");

    const tryNext = () => {
      if (idx >= sources.length) {
        playerWrap.innerHTML = `<div class="player-overlay-msg">
            <span>⚠️ Semua sumber video (${sources.length} mirror) gagal dimuat.</span>
            <span style="font-size:.8rem;opacity:.7;">Coba pilih resolusi lain atau muat ulang. Episode yang baru saja diupload kadang butuh beberapa menit sebelum videonya siap.</span>
          </div>`;
        return;
      }
      const src = sources[idx];
      videoEl.src = src;
      videoEl.load();
      videoEl.play().catch(() => {}); // autoplay bisa ditolak browser, itu bukan error sumber video
      idx += 1;
    };

    videoEl.addEventListener("error", tryNext);
    tryNext();
  },

  updateResoOptions(availableReso, currentReso) {
    const select = document.getElementById("resoSelect");
    if (!select || !availableReso || !availableReso.length) return;
    select.innerHTML = availableReso.map(r =>
      `<option value="${r}" ${r === currentReso ? "selected" : ""}>${r}</option>`
    ).join("");
  },

  renderSidePanel(animeDetail, currentEpisodeUrl, animeUrl) {
    const panel = document.getElementById("sidePanel");
    if (!animeDetail.episodes.length) {
      panel.innerHTML = Components.emptyState("📭", "Kosong", "Tidak ada episode lain.");
      return;
    }
    // Tampilkan episode terbaru di atas (sama seperti daftar episode di halaman detail)
    const reversed = [...animeDetail.episodes].reverse();
    panel.innerHTML = reversed.map(ep => `
      <a href="#/watch/${encodeURIComponent(ep.url)}?anime=${encodeURIComponent(animeUrl)}" data-link
         class="series-ep-pill ${ep.url === currentEpisodeUrl ? "current" : ""}">
        Ep ${ep.number} · ${Components.escapeHtml(ep.title.replace(/^Episode\s*/i, ""))}
      </a>
    `).join("");
  },

  setupPrevNext(animeDetail, currentEpisodeUrl, animeUrl, reso) {
    const episodes = animeDetail.episodes;
    const idx = episodes.findIndex(e => e.url === currentEpisodeUrl);
    const prevBtn = document.getElementById("prevEpBtn");
    const nextBtn = document.getElementById("nextEpBtn");

    if (idx > 0) {
      const prevEp = episodes[idx - 1];
      prevBtn.classList.remove("disabled");
      prevBtn.href = `#/watch/${encodeURIComponent(prevEp.url)}?anime=${encodeURIComponent(animeUrl)}&reso=${reso}`;
      prevBtn.setAttribute("data-link", "");
    }
    if (idx >= 0 && idx < episodes.length - 1) {
      const nextEp = episodes[idx + 1];
      nextBtn.classList.remove("disabled");
      nextBtn.href = `#/watch/${encodeURIComponent(nextEp.url)}?anime=${encodeURIComponent(animeUrl)}&reso=${reso}`;
      nextBtn.setAttribute("data-link", "");
    }
  },

  handleReaction(episodeUrl, type) {
    Storage.setReaction(episodeUrl, type);
    this.refreshReactionUI(episodeUrl);
  },

  refreshReactionUI(episodeUrl) {
    const r = Storage.getReaction(episodeUrl);
    const likeBtn = document.getElementById("likeBtn");
    if (!likeBtn) return;

    // Base count datang dari server (jumlah like global episode ini).
    // Status "sudah like" tetap dari localStorage karena API tidak
    // mengembalikan auth per-user yang konsisten antar request.
    const serverBase = this._lastServerReaction || { likeCount: 0 };
    const likeTotal = serverBase.likeCount + (r.liked ? 1 : 0);

    document.getElementById("likeCount").textContent = likeTotal;
    likeBtn.classList.toggle("liked", r.liked);
  },

  /* ================= GENRES ================= */
  async genres({ genreName }) {
    const app = document.getElementById("app");

    // Genre list lengkap sesuai API docs — value = slug untuk API, label = tampilan
    const allGenres = [
      { slug: "action", label: "Action" },
      { slug: "adventure", label: "Adventure" },
      { slug: "comedy", label: "Comedy" },
      { slug: "demons", label: "Demons" },
      { slug: "drama", label: "Drama" },
      { slug: "ecchi", label: "Ecchi" },
      { slug: "fantasy", label: "Fantasy" },
      { slug: "game", label: "Game" },
      { slug: "harem", label: "Harem" },
      { slug: "historical", label: "Historical" },
      { slug: "horror", label: "Horror" },
      { slug: "josei", label: "Josei" },
      { slug: "magic", label: "Magic" },
      { slug: "martial-arts", label: "Martial Arts" },
      { slug: "mecha", label: "Mecha" },
      { slug: "military", label: "Military" },
      { slug: "music", label: "Music" },
      { slug: "mystery", label: "Mystery" },
      { slug: "parody", label: "Parody" },
      { slug: "police", label: "Police" },
      { slug: "psychological", label: "Psychological" },
      { slug: "romance", label: "Romance" },
      { slug: "samurai", label: "Samurai" },
      { slug: "school", label: "School" },
      { slug: "sci-fi", label: "Sci-Fi" },
      { slug: "seinen", label: "Seinen" },
      { slug: "shoujo", label: "Shoujo" },
      { slug: "shoujo-ai", label: "Shoujo Ai" },
      { slug: "shounen", label: "Shounen" },
      { slug: "slice-of-life", label: "Slice of Life" },
      { slug: "space", label: "Space" },
      { slug: "sports", label: "Sports" },
      { slug: "super-power", label: "Super Power" },
      { slug: "supernatural", label: "Supernatural" },
      { slug: "thriller", label: "Thriller" },
      { slug: "vampire", label: "Vampire" },
      { slug: "yaoi", label: "Yaoi" },
      { slug: "yuri", label: "Yuri" },
    ];

    // genreName bisa berupa slug langsung dari URL
    const activeSlug = genreName ? genreName.toLowerCase() : null;
    const activeGenreObj = activeSlug ? allGenres.find(g => g.slug === activeSlug) : null;
    const activeLabel = activeGenreObj ? activeGenreObj.label : (activeSlug || null);

    app.innerHTML = `
      <section class="section genre-page">
        <div class="section-head">
          <div class="section-title"><span class="bar"></span> Jelajahi Genre</div>
        </div>
        <div class="genre-chip-grid" id="genreChips">
          ${allGenres.map(g => {
            const isActive = g.slug === activeSlug;
            return `<a href="#/genres/${encodeURIComponent(g.slug)}" data-link
              class="genre-chip-item ${isActive ? "active" : ""}">${Components.escapeHtml(g.label)}</a>`;
          }).join("")}
        </div>
      </section>

      ${activeSlug ? `
      <section class="section">
        <div class="section-head">
          <div class="section-title"><span class="bar"></span> ${Components.escapeHtml(activeLabel)}</div>
          <span class="genre-count-badge" id="genreCount">Memuat...</span>
        </div>
        <div id="genreResultSlot">${Components.skeletonNewGrid(6)}</div>
      </section>` : `
      <div class="genre-pick-hint">
        <span>👆</span>
        <p>Pilih genre di atas untuk melihat daftar animenya</p>
      </div>`}
    `;

    if (!activeSlug) return;

    try {
      const list = await Api.getByGenre(activeSlug);
      const countEl = document.getElementById("genreCount");
      if (countEl) countEl.textContent = `${list.length} Anime`;

      if (!list.length) {
        document.getElementById("genreResultSlot").innerHTML = Components.emptyState(
          "📭", "Tidak ada hasil", `Belum ada anime genre "${activeLabel}" yang tersedia.`
        );
        return;
      }

      document.getElementById("genreResultSlot").innerHTML = Components.newAnimeGrid(list);
      App.bindBookmarkButtons();
    } catch (err) {
      console.error(err);
      document.getElementById("genreResultSlot").innerHTML = Components.errorState(
        err.message, `#/genres/${encodeURIComponent(activeSlug)}`
      );
    }
  },

  /* ================= BOOKMARKS ================= */
  bookmarks() {
    const app = document.getElementById("app");
    const list = Storage.getBookmarks();

    app.innerHTML = `
      <section class="section">
        <div class="section-head">
          <div class="section-title"><span class="bar"></span> Anime Tersimpan (${list.length})</div>
        </div>
        <div id="bookmarkList"></div>
      </section>
    `;

    const slot = document.getElementById("bookmarkList");
    if (!list.length) {
      slot.innerHTML = Components.emptyState("🔖", "Belum ada bookmark", "Tambahkan anime favorit Anda dengan menekan ikon bintang.",
        `<a href="#/home" data-link class="btn btn-primary">Jelajahi Anime</a>`);
      return;
    }

    slot.innerHTML = list.map(b => `
      <div class="list-row">
        <a href="#/anime/${encodeURIComponent(b.url)}" data-link>
          <img src="${Components.escapeHtml(b.cover)}" alt="${Components.escapeHtml(b.title)}" onerror="this.src='${Components.placeholderImg()}'">
        </a>
        <div class="list-row-body">
          <a href="#/anime/${encodeURIComponent(b.url)}" data-link><div class="list-row-title">${Components.escapeHtml(b.title)}</div></a>
          <div class="list-row-meta">Ditambahkan ${new Date(b.addedAt).toLocaleDateString("id-ID")}</div>
        </div>
        <div class="list-row-actions">
          <button class="icon-action" data-remove-bookmark="${Components.escapeHtml(b.url)}" aria-label="Hapus">🗑️</button>
        </div>
      </div>
    `).join("");

    slot.querySelectorAll("[data-remove-bookmark]").forEach(btn => {
      btn.addEventListener("click", () => {
        Storage.removeBookmark(btn.dataset.removeBookmark);
        Components.toast("Bookmark dihapus");
        Pages.bookmarks();
      });
    });
  },

  /* ================= HISTORY ================= */
  history() {
    const app = document.getElementById("app");
    const list = Storage.getHistory();

    app.innerHTML = `
      <section class="section">
        <div class="section-head">
          <div class="section-title"><span class="bar"></span> Riwayat Tontonan (${list.length})</div>
          ${list.length ? `<button class="section-link" id="clearHistoryBtn" style="background:none;border:none;cursor:pointer;">Hapus Semua</button>` : ""}
        </div>
        <div id="historyList"></div>
      </section>
    `;

    const slot = document.getElementById("historyList");
    if (!list.length) {
      slot.innerHTML = Components.emptyState("🕒", "Belum ada riwayat", "Anime yang Anda tonton akan muncul di sini.",
        `<a href="#/home" data-link class="btn btn-primary">Mulai Nonton</a>`);
      return;
    }

    slot.innerHTML = list.map(h => `
      <div class="list-row">
        <a href="#/watch/${encodeURIComponent(h.episodeUrl)}?anime=${encodeURIComponent(h.animeUrl)}" data-link>
          <img src="${Components.escapeHtml(h.cover)}" alt="${Components.escapeHtml(h.animeTitle)}" onerror="this.src='${Components.placeholderImg()}'">
        </a>
        <div class="list-row-body">
          <a href="#/watch/${encodeURIComponent(h.episodeUrl)}?anime=${encodeURIComponent(h.animeUrl)}" data-link>
            <div class="list-row-title">${Components.escapeHtml(h.animeTitle)}</div>
          </a>
          <div class="list-row-meta">${Components.escapeHtml(h.episodeTitle)} · ${new Date(h.watchedAt).toLocaleString("id-ID")}</div>
        </div>
        <div class="list-row-actions">
          <button class="icon-action" data-remove-history="${Components.escapeHtml(h.episodeUrl)}" aria-label="Hapus">🗑️</button>
        </div>
      </div>
    `).join("");

    slot.querySelectorAll("[data-remove-history]").forEach(btn => {
      btn.addEventListener("click", () => {
        Storage.removeHistory(btn.dataset.removeHistory);
        Components.toast("Riwayat dihapus");
        Pages.history();
      });
    });

    document.getElementById("clearHistoryBtn")?.addEventListener("click", () => {
      if (confirm("Hapus semua riwayat tontonan?")) {
        Storage.clearHistory();
        Pages.history();
      }
    });
  },
};
