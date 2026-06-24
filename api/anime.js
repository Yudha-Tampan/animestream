export default async function handler(req, res) {
  // CORS — hanya izinkan dari domain sendiri
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const API_BASE = "https://api.theresav.biz.id/anime/animelovers";
  const API_KEY = process.env.ANIME_API_KEY; // Dari environment variable Vercel

  if (!API_KEY) {
    return res.status(500).json({ error: "API key not configured" });
  }

  // path = new, movies, detail, genre, search, episode
  const { path, ...params } = req.query;

  if (!path) return res.status(400).json({ error: "Missing path" });

  // Bangun URL ke API asli
  const url = new URL(`${API_BASE}/${path}`);
  url.searchParams.set("apikey", API_KEY);

  // Teruskan semua query param dari frontend (q, url, genre, reso, dll)
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, v);
  }

  try {
    const upstream = await fetch(url.toString());
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: "Upstream error", detail: err.message });
  }
}
