import { onRequest } from "../functions/api/[[path]].js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/robots.txt") {
      return new Response("User-agent: *\nAllow: /\n\nSitemap: https://ga-pick.com/sitemap.xml\n", {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "public, max-age=300",
        },
      });
    }

    if (url.pathname === "/sitemap.xml") {
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://ga-pick.com/</loc>
    <lastmod>2026-07-25</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://ga-pick.com/quote</loc>
    <lastmod>2026-07-25</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://ga-pick.com/my-quote</loc>
    <lastmod>2026-07-25</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://ga-pick.com/seller</loc>
    <lastmod>2026-07-25</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://ga-pick.com/seller/register</loc>
    <lastmod>2026-07-25</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`,
        {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=300",
          },
        }
      );
    }

    if (url.pathname.startsWith("/api/")) {
      return onRequest({
        request,
        env,
        ctx,
        params: {
          path: url.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean),
        },
      });
    }

    const slashRoutes = new Map([
      ["/quote", "/quote/"],
      ["/my-quote", "/my-quote/"],
      ["/seller", "/seller/"],
      ["/seller/register", "/seller/register/"],
    ]);
    if (slashRoutes.has(url.pathname)) {
      const redirectUrl = new URL(request.url);
      redirectUrl.pathname = slashRoutes.get(url.pathname);
      return Response.redirect(redirectUrl.toString(), 301);
    }

    const appRoutes = new Set(["/", "/quote/", "/my-quote/", "/seller/", "/seller/register/"]);
    if (appRoutes.has(url.pathname)) {
      const indexUrl = new URL(request.url);
      indexUrl.pathname = "/index.html";
      return env.ASSETS.fetch(new Request(indexUrl, request));
    }

    return env.ASSETS.fetch(request);
  },
};
