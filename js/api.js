/* ============================================================
   API LAYER
   Request dikirim ke /api/anime (Vercel Serverless Function).
   API key disimpan di environment variable Vercel — tidak pernah
   muncul di browser sama sekali.
   ============================================================ */

const API_PROXY = "/api/anime";

const Api = {

  async _get(path, params = {}) {
    const url = new URL(API_PROXY, location.origin);
    url.searchParams.set("path", path);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
    });
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  },

  /* -------- list endpoint (homepage / new releases) -------- */
  async getNewAnime() {
    const json = await this._get("new");
    const raw = json.data || json.result || json.results || [];
    return raw.map(Api._normalizeListItem);
  },

  /* -------- list endpoint (movies) -------- */
  async getMovies() {
    const json = await this._get("movies");
    const raw = json.data || json.result || json.results || [];
    return raw.map(Api._normalizeListItem);
  },

  _normalizeListItem(item) {
    return {
      id: item.id ?? item.episode_id ?? null,
      url: item.url ?? item.slug ?? item.link ?? "",
      title: item.judul ?? item.title ?? item.name ?? "Untitled",
      cover: item.cover ?? item.thumbnail ?? item.image ?? item.poster ?? "",
      info: item.lastup ?? item.episode ?? item.status ?? "",
    };
  },

  /* -------- genre endpoint -------- */
  async getByGenre(genre) {
    const json = await this._get("genre", { genre: genre.toLowerCase() });
    const raw = json.data || json.result || json.results || [];
    return raw.map(item => ({
      id: item.id ?? null,
      url: item.link ?? item.url ?? item.slug ?? "",
      title: item.anime_name ?? item.judul ?? item.title ?? "Untitled",
      cover: item.thumb ?? item.cover ?? item.thumbnail ?? item.image ?? "",
      info: "",
    }));
  },

  /* -------- search endpoint -------- */
  async search(query) {
    try {
      const json = await this._get("search", { q: query });
      const raw = json.data || json.result || [];
      return {
        total: json.total ?? raw.length,
        items: raw.map(Api._normalizeListItem),
      };
    } catch (e) {
      return null;
    }
  },

  /* -------- detail endpoint -------- */
  async getDetail(slug) {
    const json = await this._get("detail", { url: slug });
    const d = json?.data?.data?.[0] ?? json?.data?.[0] ?? json?.data ?? {};
    return Api._normalizeDetail(d, slug);
  },

  _normalizeDetail(d, slug) {
    const genres = d.genre ?? d.genres ?? d.genreurl ?? [];
    const genreArr = Array.isArray(genres)
      ? genres.map(g => (typeof g === "string" ? g : (g.name ?? g.judul ?? "")))
      : (typeof genres === "string" ? genres.split(",").map(s => s.trim()) : []);

    const chapterRaw = d.chapter ?? d.episode ?? d.episode_list ?? d.episodes ?? [];
    const episodes = (Array.isArray(chapterRaw) ? chapterRaw : [])
      .map(Api._normalizeEpisodeListItem)
      // Episode tanpa url valid (misal episode baru yang field-nya belum lengkap dari
      // upstream) dibuang di sini, supaya tidak menghasilkan link "#/watch/" rusak
      // yang membuat halaman watch blank/error saat diklik.
      .filter(ep => {
        if (ep.url) return true;
        console.warn("[Api] Episode dilewati karena tidak punya url valid:", ep);
        return false;
      })
      .reverse();

    return {
      url: d.series_id ?? d.url ?? slug,
      title: d.judul ?? d.title ?? d.name ?? "Untitled",
      cover: d.cover ?? d.thumbnail ?? d.image ?? d.poster ?? "",
      rating: d.rating ?? d.score ?? d.nilai ?? "-",
      status: d.status ?? d.state ?? "-",
      releaseDate: d.published ?? d.tanggal_rilis ?? d.release_date ?? d.rilis ?? d.aired ?? "-",
      studio: d.author ?? d.studio ?? d.produser ?? "-",
      genres: genreArr.filter(Boolean),
      synopsis: d.sinopsis ?? d.synopsis ?? d.deskripsi ?? d.description ?? "Sinopsis tidak tersedia.",
      episodes,
      type: d.type ?? d.tipe ?? "-",
      duration: d.durasi ?? d.duration ?? "-",
    };
  },

  _normalizeEpisodeListItem(ep, idx) {
    if (typeof ep === "string") {
      return { url: ep, title: `Episode ${idx + 1}`, number: idx + 1 };
    }
    const chLabel = ep.ch ?? ep.episode ?? ep.judul ?? ep.title ?? `${idx + 1}`;
    const numMatch = String(chLabel).match(/[\d.]+/);
    // Beberapa episode (khususnya yang baru rilis) kadang memakai nama field
    // yang belum pernah muncul di episode lama, jadi daftar fallback dibuat
    // selengkap mungkin sebelum dianggap "tidak punya url".
    const url = ep.url ?? ep.slug ?? ep.link ?? ep.episode_url ?? ep.chapter_url
      ?? ep.endpoint ?? ep.path ?? ep.href ?? "";

    // Normalisasi date: bisa berupa Unix timestamp (string/number) atau teks tanggal
    let date = null;
    const rawDate = ep.date ?? null;
    if (rawDate !== null && rawDate !== undefined && rawDate !== "") {
      const asNum = Number(rawDate);
      if (!isNaN(asNum) && asNum > 1000000000) {
        // Unix timestamp (detik) → konversi ke teks tanggal Indonesia
        try {
          date = new Date(asNum * 1000).toLocaleDateString("id-ID", {
            day: "numeric", month: "long", year: "numeric"
          });
        } catch (_) {
          date = String(rawDate);
        }
      } else {
        // Sudah berupa teks tanggal (misal "23 Juni, 2026")
        date = String(rawDate);
      }
    }

    return {
      url,
      title: `Episode ${chLabel}`,
      number: numMatch ? parseFloat(numMatch[0]) : (idx + 1),
      date,
    };
  },

  /* -------- episode/stream endpoint -------- */
  async getEpisode(episodeUrl, reso) {
    const json = await this._get("episode", { url: episodeUrl, reso });
    const d = json?.data?.data?.[0] ?? json?.data?.[0] ?? json?.data ?? {};
    return Api._normalizeEpisode(d, episodeUrl, reso);
  },

  /* Link dari storage animekita dan pixeldrain butuh perlakuan khusus:
     - storage.animekita.org: ada hotlink protection, request harus datang dari
       server (bukan browser langsung). Kita proxy lewat /api/stream.
     - pixeldrain.com: ?download bikin browser download bukan stream. Hapus param itu.
  */
  _toPlayableUrl(link) {
    if (!link) return link;
    try {
      const u = new URL(link);

      // animekita storage → proxy lewat /api/stream agar bypass hotlink protection
      if (
        u.hostname === "storage.animekita.org" ||
        u.hostname.endsWith(".animekita.org")
      ) {
        return `/api/stream?url=${encodeURIComponent(link)}`;
      }

      // pixeldrain → hapus ?download supaya jadi inline stream
      if (u.hostname === "pixeldrain.com" || u.hostname.endsWith(".pixeldrain.com")) {
        u.searchParams.delete("download");
        return u.toString();
      }
    } catch (_) {
      // bukan URL absolut yang valid, kembalikan apa adanya
    }
    return link;
  },

  _normalizeEpisode(d, episodeUrl, requestedReso) {
    const streamArr = Array.isArray(d.stream) ? d.stream : [];
    const availableReso = Array.isArray(d.reso) ? d.reso : ["360p", "480p", "720p", "1080p", "4K"];

    const matching = streamArr.filter(s => s.reso === requestedReso);
    const candidates = matching.length ? matching : streamArr;

    const primary = candidates[0] || null;
    const mirrors = candidates.slice(1);

    return {
      url: episodeUrl,
      title: d.title ?? d.judul ?? `Episode`,
      videoUrl: Api._toPlayableUrl(primary?.link ?? ""),
      mirrors: mirrors.map(m => ({ link: Api._toPlayableUrl(m.link), provide: m.provide })),
      availableReso,
      likeCount: d.likeCount ?? 0,
      dislikeCount: d.dislikeCount ?? 0,
      userLikeStatus: d.userLikeStatus ?? 0,
      episodeId: d.episode_id ?? null,
      nextEpisode: d.next_episode ?? d.next ?? null,
      prevEpisode: d.prev_episode ?? d.previous ?? null,
    };
  },
};
