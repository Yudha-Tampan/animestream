/* ============================================================
   STORAGE LAYER — semua persistensi via localStorage
   ============================================================ */

const Storage = {
  KEYS: {
    BOOKMARKS: "aw_bookmarks",
    HISTORY: "aw_history",
    THEME: "aw_theme",
    REACTIONS: "aw_reactions", // like/dislike per episode (client-side only)
  },

  _read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  },
  _write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* storage full or blocked — fail silently */ }
  },

  /* ---------------- THEME ---------------- */
  getTheme() {
    return this._read(this.KEYS.THEME, "dark");
  },
  setTheme(theme) {
    this._write(this.KEYS.THEME, theme);
  },

  /* ---------------- BOOKMARKS ---------------- */
  getBookmarks() {
    return this._read(this.KEYS.BOOKMARKS, []);
  },
  isBookmarked(url) {
    return this.getBookmarks().some(b => b.url === url);
  },
  toggleBookmark(anime) {
    const list = this.getBookmarks();
    const idx = list.findIndex(b => b.url === anime.url);
    if (idx >= 0) {
      list.splice(idx, 1);
      this._write(this.KEYS.BOOKMARKS, list);
      return false;
    } else {
      list.unshift({
        url: anime.url,
        title: anime.title,
        cover: anime.cover,
        addedAt: Date.now(),
      });
      this._write(this.KEYS.BOOKMARKS, list);
      return true;
    }
  },
  removeBookmark(url) {
    const list = this.getBookmarks().filter(b => b.url !== url);
    this._write(this.KEYS.BOOKMARKS, list);
  },

  /* ---------------- HISTORY ---------------- */
  getHistory() {
    return this._read(this.KEYS.HISTORY, []);
  },
  addHistory(entry) {
    // entry: { animeUrl, animeTitle, cover, episodeUrl, episodeTitle }
    let list = this.getHistory();
    list = list.filter(h => h.episodeUrl !== entry.episodeUrl);
    list.unshift({ ...entry, watchedAt: Date.now() });
    if (list.length > 100) list = list.slice(0, 100);
    this._write(this.KEYS.HISTORY, list);
  },
  isEpisodeWatched(episodeUrl) {
    return this.getHistory().some(h => h.episodeUrl === episodeUrl);
  },
  removeHistory(episodeUrl) {
    const list = this.getHistory().filter(h => h.episodeUrl !== episodeUrl);
    this._write(this.KEYS.HISTORY, list);
  },
  clearHistory() {
    this._write(this.KEYS.HISTORY, []);
  },

  /* ---------------- LIKE / DISLIKE ---------------- */
  getReaction(episodeUrl) {
    const map = this._read(this.KEYS.REACTIONS, {});
    return map[episodeUrl] || { liked: false, disliked: false, likes: 0, dislikes: 0 };
  },
  setReaction(episodeUrl, type) {
    const map = this._read(this.KEYS.REACTIONS, {});
    const current = map[episodeUrl] || { liked: false, disliked: false, likes: 0, dislikes: 0 };

    if (type === "like") {
      if (current.liked) {
        current.liked = false;
        current.likes = Math.max(0, current.likes - 1);
      } else {
        if (current.disliked) {
          current.disliked = false;
          current.dislikes = Math.max(0, current.dislikes - 1);
        }
        current.liked = true;
        current.likes += 1;
      }
    } else if (type === "dislike") {
      if (current.disliked) {
        current.disliked = false;
        current.dislikes = Math.max(0, current.dislikes - 1);
      } else {
        if (current.liked) {
          current.liked = false;
          current.likes = Math.max(0, current.likes - 1);
        }
        current.disliked = true;
        current.dislikes += 1;
      }
    }
    map[episodeUrl] = current;
    this._write(this.KEYS.REACTIONS, map);
    return current;
  },
};
