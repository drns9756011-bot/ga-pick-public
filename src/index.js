import { onRequest, onScheduled } from "../functions/api/[[path]].js";
import { SEARCH_ORIGIN, SEARCH_PAGES } from "./search-config.js";

const routePages = new Map(SEARCH_PAGES.map((page) => [page.path, page]));
const appPaths = new Set(["/", "/quote", "/my-quote"]);
const aliases = new Map([
  ["/index.html", "/"], ["/products", "/shopping"], ["/products/index.html", "/shopping"],
  ...SEARCH_PAGES.filter((page) => page.path !== "/").map((page) => [page.path + "/index.html", page.path]),
]);

function responsePolicy(response, url, path) {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Content-Security-Policy", "base-uri 'self'; object-src 'none'; frame-ancestors 'none'");
  const privatePath = path.startsWith("/api/") || path === "/admin" || path.startsWith("/admin/") ||
    path === "/seller" || path.startsWith("/seller/") || routePages.get(path)?.index === false;
  if (privatePath || response.status >= 400 || url.hostname !== "ga-pick.com") {
    headers.set("X-Robots-Tag", "noindex, nofollow, nosnippet");
  }
  if (routePages.has(path)) {
    headers.set("Link", '<' + SEARCH_ORIGIN + path + '>; rel="canonical"');
    headers.set("Cache-Control", "no-store");
    headers.set("X-GA-Pick-Route-Version", "20261014-search-security");
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function route(request, env, ctx, url, path) {
  if (url.pathname.startsWith("/api/")) {
    return onRequest({ request, env, ctx, params: { path: url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean) } });
  }
  if (path === "/admin" || path.startsWith("/admin/")) {
    return new Response("Not found", { status: 404 });
  }
  if (path === "/seller" || path === "/seller/index.html") return Response.redirect("https://partner.ga-pick.com/", 308);
  if (path === "/seller/register" || path === "/seller/register/index.html") return Response.redirect("https://partner.ga-pick.com/register", 308);
  if (["GET", "HEAD"].includes(request.method)) {
    const canonical = aliases.get(path) || path;
    if (url.hostname === "www.ga-pick.com" || aliases.has(path) ||
        (routePages.has(path) && url.pathname !== path)) {
      const destination = new URL(url);
      if (url.hostname === "www.ga-pick.com") destination.hostname = "ga-pick.com";
      destination.pathname = canonical;
      return Response.redirect(destination.toString(), 308);
    }
  }
  const page = routePages.get(path);
  if (page) {
    const assetUrl = new URL(url);
    assetUrl.pathname = "/" + page.file;
    const response = await env.ASSETS.fetch(new Request(assetUrl, { method: "GET", headers: request.headers, redirect: "manual" }));
    if (response.status >= 300 && response.status < 400 && appPaths.has(path)) {
      return new Response("Application shell routing error", { status: 500 });
    }
    return response;
  }
  return env.ASSETS.fetch(request);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    let path;
    try {
      path = decodeURIComponent(url.pathname).replace(/\/+$/, "") || "/";
    } catch {
      return responsePolicy(new Response("Bad request", { status: 400 }), url, "");
    }
    return responsePolicy(await route(request, env, ctx, url, path), url, path);
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(onScheduled({ event, env, ctx }));
  },
};
