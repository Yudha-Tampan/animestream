/* ============================================================
   ROUTER — hash-based SPA routing
   ============================================================ */

const Router = {
  routes: [],

  add(pattern, handler) {
    // convert pattern like "/anime/:slug" to regex
    const paramNames = [];
    const regexStr = pattern.replace(/:[^/]+/g, (match) => {
      paramNames.push(match.slice(1));
      return "([^/]+)";
    });
    this.routes.push({
      regex: new RegExp(`^${regexStr}$`),
      paramNames,
      handler,
    });
  },

  async resolve() {
    const hash = location.hash.slice(1) || "/home";
    const path = hash.split("?")[0];

    for (const route of this.routes) {
      const match = path.match(route.regex);
      if (match) {
        const params = {};
        route.paramNames.forEach((name, i) => {
          params[name] = decodeURIComponent(match[i + 1]);
        });
        window.scrollTo({ top: 0, behavior: "instant" });
        await route.handler(params);
        Router.updateActiveNav(path);
        return;
      }
    }
    // no match -> 404
    document.getElementById("app").innerHTML = Components.emptyState(
      "🔍", "Halaman tidak ditemukan", "URL yang Anda tuju tidak tersedia.",
      `<a href="#/home" data-link class="btn btn-primary">Kembali ke Home</a>`
    );
  },

  updateActiveNav(path) {
    const routeKey = path.split("/")[1] || "home";
    document.querySelectorAll(".nav-link, .mobile-nav a").forEach(link => {
      link.classList.toggle("active", link.dataset.route === routeKey);
    });
  },

  init() {
    window.addEventListener("hashchange", () => Router.resolve());
    window.addEventListener("DOMContentLoaded", () => Router.resolve());
  },
};
