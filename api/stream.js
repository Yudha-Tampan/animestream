/**
 * /api/stream?url=<encoded_video_url>
 *
 * Proxy video dari storage animekita (dan provider lain) agar tidak
 * kena hotlink protection / CORS restriction saat diputar di browser.
 * Request dari browser ke sini, lalu server yang fetch ke upstream.
 *
 * Support: HTTP Range requests (penting untuk seek di video player).
 */
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Missing url param" });

  let targetUrl;
  try {
    targetUrl = decodeURIComponent(url);
    new URL(targetUrl); // validate
  } catch {
    return res.status(400).json({ error: "Invalid url" });
  }

  // Hanya izinkan domain yang dikenal (cegah SSRF)
  const allowed = [
    "storage.animekita.org",
    "assets.animekita.org",
    "pixeldrain.com",
    "cdn.pixeldrain.com",
  ];
  const host = new URL(targetUrl).hostname;
  if (!allowed.some(d => host === d || host.endsWith("." + d))) {
    return res.status(403).json({ error: "Domain not allowed: " + host });
  }

  const headers = {
    "Referer": "https://animekita.org/",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
    "Origin": "https://animekita.org",
  };

  // Teruskan Range header dari browser (untuk seek/resume)
  if (req.headers["range"]) {
    headers["Range"] = req.headers["range"];
  }

  try {
    const upstream = await fetch(targetUrl, { headers });

    // Teruskan status & header penting ke browser
    const passthroughHeaders = [
      "content-type", "content-length", "content-range",
      "accept-ranges", "cache-control", "last-modified", "etag",
    ];
    passthroughHeaders.forEach(h => {
      const v = upstream.headers.get(h);
      if (v) res.setHeader(h, v);
    });

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(upstream.status);

    const reader = upstream.body.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { res.end(); return; }
        res.write(Buffer.from(value));
      }
    };
    await pump();
  } catch (err) {
    res.status(502).json({ error: "Upstream fetch failed", detail: err.message });
  }
}
