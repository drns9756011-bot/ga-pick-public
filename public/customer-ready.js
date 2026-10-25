(() => {
  const overlay = document.createElement("div");
  overlay.className = "customer-page-loading";
  overlay.setAttribute("role", "status");
  overlay.setAttribute("aria-live", "polite");
  overlay.innerHTML = '<span class="customer-loading-spinner" aria-hidden="true"></span><p>불러오는 중입니다.</p>';
  document.body.append(overlay);
  document.documentElement.classList.add("customer-is-loading");
  let finished = false;
  let failed = false;
  const timer = setTimeout(fail, 22000);
  const imageLoads = new Map();

  function fail() {
    if (finished || failed) return;
    failed = true;
    clearTimeout(timer);
    overlay.setAttribute("role", "alert");
    overlay.innerHTML = '<p>화면을 불러오지 못했습니다.</p><button type="button">다시 시도</button><a href="/">첫 화면으로</a>';
    overlay.querySelector("button").addEventListener("click", () => location.reload());
  }

  function ready() {
    if (failed || finished) return;
    finished = true;
    clearTimeout(timer);
    overlay.remove();
    document.documentElement.classList.remove("customer-is-loading");
  }

  function images(urls) {
    return Promise.all([...new Set(urls.filter(Boolean))].map((url) => {
      if (imageLoads.has(url)) return imageLoads.get(url);
      const promise = new Promise((resolve, reject) => {
        const image = new Image();
        const timeout = setTimeout(() => settle(new Error("image timeout")), 6000);
        function settle(error) {
          clearTimeout(timeout);
          image.onload = image.onerror = null;
          if (error) reject(error); else resolve();
        }
        image.onload = () => image.decode().then(() => settle(), settle);
        image.onerror = () => settle(new Error("image unavailable"));
        image.src = url;
      });
      imageLoads.set(url, promise);
      return promise;
    }));
  }

  window.PickPageReady = { ready, fail, images };
  document.addEventListener("DOMContentLoaded", async () => {
    const path = location.pathname.replace(/\/+$/, "") || "/";
    if (["/brand", "/subscription", "/shopping"].includes(path)) return;
    if (["/", "/quote", "/my-quote"].includes(path) &&
        (!document.documentElement.classList.contains("app-ready") ||
         !document.querySelector('[data-wizard-ready="true"]'))) {
      fail();
      return;
    }
    try {
      await images([...document.querySelectorAll(".pq-hero-scene img")].filter(image => image.getClientRects().length).map(image => image.src));
      ready();
    } catch {
      fail();
    }
  }, { once: true });
})();
