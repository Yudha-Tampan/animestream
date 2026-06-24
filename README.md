# MiruNime 🌊

Website streaming anime modern dibuat dengan **HTML, CSS, dan JavaScript vanilla** (tanpa framework, tanpa build step).

## ✨ Fitur

- Homepage dengan daftar anime terbaru dan movie terbaru dari API (masing-masing carousel + horizontal scroll)
- Halaman Movie tersendiri dengan tampilan yang sama seperti Anime Terbaru
- Trending carousel otomatis (anime & movie, berjalan independen)
- "Lihat Semua" menampilkan seluruh anime terbaru atau seluruh movie dalam bentuk grid (bukan carousel)
- Search realtime (debounced)
- Grid anime responsive
- Halaman detail: cover, judul, rating, status, tanggal rilis, studio, genre badges, sinopsis, daftar episode
- Halaman nonton (watch): video player HTML5, ganti resolusi (360p–4K), next/prev episode, daftar episode samping, like/dislike counter
- Dark mode / Light mode toggle (tersimpan di localStorage)
- Skeleton loading di semua halaman
- Bookmark anime (localStorage)
- Riwayat tontonan (localStorage)
- Genre filter / chip
- Fully responsive (mobile, tablet, desktop)
- Siap deploy ke **Vercel** (static site, SPA hash-routing — tidak perlu rewrite rule kompleks)

## 📁 Struktur Folder

```
animestream/
├── index.html
├── vercel.json
├── package.json
├── css/
│   └── style.css
└── js/
    ├── api.js          # Layer komunikasi ke API
    ├── storage.js      # LocalStorage (bookmark, history, theme, like/dislike)
    ├── components.js   # Fungsi render UI yang dipakai berulang
    ├── router.js       # Hash-based SPA router
    ├── pages.js         # Logic tiap halaman
    └── app.js           # Entry point & inisialisasi
```

## 🔌 Endpoint API yang digunakan

```
GET https://api.theresav.biz.id/anime/animelovers/new?apikey=myapikey-111
GET https://api.theresav.biz.id/anime/animelovers/movies?apikey=myapikey-111
GET https://api.theresav.biz.id/anime/animelovers/detail?url={slug}&apikey=myapikey-111
GET https://api.theresav.biz.id/anime/animelovers/episode?url={episode}&reso={quality}&apikey=myapikey-111
```

> **Catatan penting:** Endpoint `/new` dan `/movies` sudah diverifikasi langsung dan strukturnya konsisten
> (`{ data: [{ id, url, judul, cover, lastup }] }`). Endpoint `/detail` dan `/episode` **belum
> bisa diverifikasi** struktur responsnya secara langsung saat pembuatan kode ini. Karena itu,
> `js/api.js` ditulis dengan **parsing defensif** — mencoba banyak kemungkinan nama field
> (`judul`/`title`, `sinopsis`/`synopsis`, `episode_list`/`episodes`/`daftar_episode`, dll).
>
> **Jika setelah deploy halaman detail/episode tidak menampilkan data dengan benar:**
> 1. Buka halaman tersebut, lalu buka DevTools → tab Network → klik request ke `detail` atau `episode`.
> 2. Lihat nama field asli pada response JSON.
> 3. Sesuaikan mapping di `js/api.js` pada fungsi `_normalizeDetail()` dan `_normalizeEpisode()`
>    (tambahkan nama field yang sesuai ke daftar `??` yang sudah ada).

Karena endpoint `/new` tidak menyertakan data genre per-anime, halaman **Genre** saat ini
menampilkan seluruh anime terbaru sebagai fallback sambil menunjukkan catatan keterbatasan data.
Jika backend menyediakan endpoint genre khusus di masa depan, tinggal tambahkan call baru di
`Api` dan gunakan di `Pages.genres()`.

## 🚀 Menjalankan secara lokal

Karena ini pure static site, cukup jalankan local server (perlu agar `fetch()` tidak diblokir CORS-file://):

```bash
npx serve .
# atau
python3 -m http.server 8080
```

Lalu buka `http://localhost:8080` (atau port yang ditampilkan).

## ☁️ Deploy ke Vercel

**Cara 1 — via Vercel CLI:**
```bash
npm i -g vercel
cd animestream
vercel
```
Ikuti instruksi (pilih "Other" sebagai framework, root directory tetap `.`, tidak perlu build command).

**Cara 2 — via Dashboard Vercel:**
1. Push folder ini ke repo GitHub/GitLab/Bitbucket.
2. Buka [vercel.com/new](https://vercel.com/new), import repo tersebut.
3. Framework Preset: **Other**. Build Command: kosongkan. Output Directory: `.` (root).
4. Klik **Deploy**.

File `vercel.json` sudah disiapkan agar semua route SPA (`#/...`) tetap berfungsi.

## 🎨 Kustomisasi

- Warna aksen & tema: ubah variabel CSS di `:root` pada `css/style.css` (`--accent`, `--accent-2`, dll).
- API key/endpoint: ubah konstanta `API_BASE` dan `API_KEY` di `js/api.js`.
- Auto-slide carousel: ubah interval `5000` (ms) di `Components.initCarousel()` pada `js/components.js`.

## ⚠️ Disclaimer

Proyek ini murni front-end dan bergantung pada API pihak ketiga (`api.theresav.biz.id`) untuk
seluruh data anime dan video. Ketersediaan konten bergantung sepenuhnya pada API tersebut.
