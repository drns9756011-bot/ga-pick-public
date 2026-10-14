(() => {
  const configuration = document.querySelector("#pickSearchRoutes");
  if (!configuration) return;
  const routes = JSON.parse(configuration.textContent);
  let current = "";
  function sync() {
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    const page = routes.find((item) => item.path === path);
    if (!page || current === path) return;
    current = path;
    const canonical = "https://ga-pick.com" + path;
    document.title = page.title;
    document.querySelector('link[rel="canonical"]').href = canonical;
    const values = {
      description: page.description,
      robots: page.index ? "index, follow, max-image-preview:large" : "noindex, nofollow, nosnippet",
      "og:title": page.title, "og:description": page.description, "og:url": canonical,
      "twitter:title": page.title, "twitter:description": page.description,
    };
    for (const [key, value] of Object.entries(values)) {
      const element = document.querySelector('meta[name="' + key + '"],meta[property="' + key + '"]');
      if (element) element.content = value;
    }
    let data = document.querySelector("#pickSearchStructuredData");
    if (!page.graph) {
      data?.remove();
    } else {
      if (!data) {
        data = document.createElement("script");
        data.type = "application/ld+json";
        data.id = "pickSearchStructuredData";
        document.head.appendChild(data);
      }
      data.textContent = JSON.stringify(page.graph);
    }
  }
  new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ["data-initial-view"] });
  window.addEventListener("popstate", sync);
  sync();
})();
