#!/usr/bin/env node
/**
 * ============================================
 * iKFZ SEO AUDIT SYSTEM — Fully Automated
 * ============================================
 * Phase 1: Fetch all WordPress URLs (pages + posts, paginated)
 * Phase 2: Crawl Next.js site (internal link discovery)
 * Phase 3: URL normalization
 * Phase 4: Comparison engine (missing, extra, matched)
 * Phase 5: SEO validation (title, description, canonical, noindex)
 * Phase 6: Report generation (JSON + HTML)
 * Phase 7: Fail-safe system (exit code 1 if critical issues)
 * Phase 8: Sitemap comparison + concurrency
 *
 * Usage: npx tsx scripts/seo-audit.ts
 */

import * as fs from "fs";
import * as path from "path";
import * as cheerio from "cheerio";

// ─── Config ───────────────────────────────────────────────
const WP_BASE = "https://ikfzdigitalzulassung.de";
const WP_API = `${WP_BASE}/wp-json/wp/v2`;
const NEXT_BASE = "http://localhost:3000";
const OUTPUT_DIR = path.join(process.cwd(), "audit");
const CONCURRENCY = 8;
const REQUEST_TIMEOUT = 15000;

// URLs to skip (WP-specific, not migrated intentionally)
const SKIP_SLUGS = new Set([
  "warenkorb", "mein-konto", "kasse", "antragsuebersicht",
  "startseite", "starseite-2", "shop",
]);

interface WPUrl {
  slug: string;
  url: string;
  status: string;
  type: "page" | "post";
  title: string;
  seo?: { metaTitle?: string; metaDesc?: string; canonical?: string; robots?: string };
}

interface NextUrl {
  url: string;
  slug: string;
  statusCode: number;
  title?: string;
  metaDescription?: string;
  canonical?: string;
  robots?: string;
  hasNoindex: boolean;
  linkedFrom?: string[];
}

interface AuditResult {
  timestamp: string;
  summary: { wpTotal: number; nextTotal: number; matched: number; missing: number; extra: number; broken: number; seoIssues: number };
  matched: { slug: string; wpUrl: string; nextUrl: string; seoMatch: boolean }[];
  missing: { slug: string; wpUrl: string; type: string; title: string }[];
  extra: { slug: string; nextUrl: string }[];
  broken: { url: string; statusCode: number; slug: string }[];
  seoIssues: { slug: string; url: string; issues: string[] }[];
  sitemapComparison?: { inWpOnly: string[]; inNextOnly: string[]; inBoth: string[] };
}

// ─── Utilities ────────────────────────────────────────────
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    let p = u.pathname.toLowerCase().replace(/\/+$/, "").replace(/\/+/g, "/");
    if (!p) p = "";
    return p;
  } catch {
    return url.toLowerCase().replace(/\/+$/, "").replace(/\/+/g, "/");
  }
}

function normalizeSlug(slug: string): string {
  return slug.toLowerCase().replace(/^\/+|\/+$/g, "");
}

async function fetchWithTimeout(url: string, timeout = REQUEST_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: "follow" });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function runConcurrent<T, R>(items: T[], fn: (item: T) => Promise<R>, concurrency: number): Promise<R[]> {
  const results: R[] = [];
  const executing = new Set<Promise<void>>();

  for (const item of items) {
    const p = fn(item).then(r => { results.push(r); });
    executing.add(p);
    p.finally(() => executing.delete(p));
    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);
  return results;
}

function log(phase: string, msg: string) {
  console.log(`\x1b[36m[${phase}]\x1b[0m ${msg}`);
}
function logOk(msg: string) { console.log(`  \x1b[32m✓\x1b[0m ${msg}`); }
function logWarn(msg: string) { console.log(`  \x1b[33m⚠\x1b[0m ${msg}`); }
function logErr(msg: string) { console.log(`  \x1b[31m✗\x1b[0m ${msg}`); }

// ═══════════════════════════════════════════════════════════
// PHASE 1: FETCH ALL WORDPRESS URLS
// ═══════════════════════════════════════════════════════════
async function fetchWordPressUrls(): Promise<WPUrl[]> {
  log("PHASE 1", "Fetching all WordPress URLs...");
  const allUrls: WPUrl[] = [];

  for (const type of ["pages", "posts"] as const) {
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const url = `${WP_API}/${type}?per_page=100&page=${page}&_fields=id,slug,title,link,status`;
      log("PHASE 1", `Fetching ${type} page ${page}/${totalPages}...`);

      try {
        const res = await fetchWithTimeout(url);
        const tp = res.headers.get("x-wp-totalpages");
        if (tp) totalPages = parseInt(tp, 10);

        const items: any[] = await res.json();
        for (const item of items) {
          const slug = normalizeSlug(item.slug);
          if (SKIP_SLUGS.has(slug)) continue;

          allUrls.push({
            slug,
            url: item.link || `${WP_BASE}/${slug}/`,
            status: item.status,
            type: type === "pages" ? "page" : "post",
            title: item.title?.rendered || item.title || "",
          });
        }
      } catch (err: any) {
        logErr(`Failed to fetch ${type} page ${page}: ${err.message}`);
      }
      page++;
    }
    logOk(`${type}: found ${allUrls.filter(u => u.type === (type === "pages" ? "page" : "post")).length}`);
  }

  // Scrape SEO data from WP pages (using HTML head)
  log("PHASE 1", "Scraping SEO data from WordPress...");
  await runConcurrent(allUrls, async (item) => {
    try {
      const res = await fetchWithTimeout(item.url);
      if (!res.ok) return;
      const html = await res.text();
      const $ = cheerio.load(html);

      item.seo = {
        metaTitle: $("title").text().trim() || undefined,
        metaDesc: $('meta[name="description"]').attr("content")?.trim() || undefined,
        canonical: $('link[rel="canonical"]').attr("href")?.trim() || undefined,
        robots: $('meta[name="robots"]').attr("content")?.trim() || undefined,
      };
    } catch { /* skip */ }
  }, CONCURRENCY);

  logOk(`Total WordPress URLs: ${allUrls.length}`);
  return allUrls;
}

// ═══════════════════════════════════════════════════════════
// PHASE 2: CRAWL NEXT.JS WEBSITE
// ═══════════════════════════════════════════════════════════
async function crawlNextJs(): Promise<Map<string, NextUrl>> {
  log("PHASE 2", "Crawling Next.js website...");

  const visited = new Map<string, NextUrl>();
  const queue: { url: string; from: string }[] = [{ url: NEXT_BASE, from: "start" }];
  const seen = new Set<string>();

  // Also seed from sitemap
  try {
    const sitemapRes = await fetchWithTimeout(`${NEXT_BASE}/sitemap.xml`);
    if (sitemapRes.ok) {
      const sitemapXml = await sitemapRes.text();
      const $ = cheerio.load(sitemapXml, { xmlMode: true });
      $("url loc").each((_, el) => {
        const loc = $(el).text().trim();
        if (loc) {
          const normalized = loc.replace(WP_BASE, NEXT_BASE).replace(/\/$/, "");
          if (!seen.has(normalized)) {
            queue.push({ url: normalized, from: "sitemap" });
            seen.add(normalized);
          }
        }
      });
      logOk(`Sitemap seeded ${seen.size} URLs`);
    }
  } catch { logWarn("Could not fetch sitemap"); }

  // BFS crawl
  while (queue.length > 0) {
    const batch = queue.splice(0, CONCURRENCY);

    await Promise.allSettled(batch.map(async ({ url: rawUrl, from }) => {
      const urlPath = normalizeUrl(rawUrl);
      if (visited.has(urlPath)) {
        visited.get(urlPath)!.linkedFrom?.push(from);
        return;
      }

      // Skip external, mailto, tel, anchor, assets
      try {
        const u = new URL(rawUrl.startsWith("http") ? rawUrl : `${NEXT_BASE}${rawUrl}`);
        if (u.origin !== new URL(NEXT_BASE).origin) return;
        if (u.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|json)$/i)) return;
      } catch { return; }

      const fullUrl = rawUrl.startsWith("http") ? rawUrl : `${NEXT_BASE}${rawUrl}`;

      try {
        const res = await fetchWithTimeout(fullUrl);
        const slug = urlPath.replace(/^\//, "") || "";
        const html = await res.text();
        const $ = cheerio.load(html);

        const entry: NextUrl = {
          url: fullUrl,
          slug,
          statusCode: res.status,
          title: $("title").text().trim() || undefined,
          metaDescription: $('meta[name="description"]').attr("content")?.trim() || undefined,
          canonical: $('link[rel="canonical"]').attr("href")?.trim() || undefined,
          robots: $('meta[name="robots"]').attr("content")?.trim() || undefined,
          hasNoindex: ($('meta[name="robots"]').attr("content") || "").toLowerCase().includes("noindex"),
          linkedFrom: [from],
        };

        visited.set(urlPath, entry);

        // Extract internal links
        if (res.status === 200) {
          $("a[href]").each((_, el) => {
            let href = $(el).attr("href");
            if (!href) return;
            if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("#")) return;
            if (href.startsWith("javascript:")) return;

            try {
              const resolved = new URL(href, fullUrl);
              if (resolved.origin !== new URL(NEXT_BASE).origin) return;
              const normalizedHref = normalizeUrl(resolved.href);
              if (!visited.has(normalizedHref) && !seen.has(resolved.href)) {
                queue.push({ url: resolved.href, from: urlPath });
                seen.add(resolved.href);
              }
            } catch { /* skip invalid URLs */ }
          });
        }
      } catch (err: any) {
        visited.set(urlPath, {
          url: fullUrl, slug: urlPath.replace(/^\//, ""), statusCode: 0,
          hasNoindex: false, linkedFrom: [from],
        });
      }
    }));
  }

  logOk(`Crawled ${visited.size} Next.js pages`);
  return visited;
}

// ═══════════════════════════════════════════════════════════
// PHASE 3 & 4: NORMALIZE + COMPARE
// ═══════════════════════════════════════════════════════════
function compareUrls(wpUrls: WPUrl[], nextUrls: Map<string, NextUrl>): AuditResult {
  log("PHASE 3-4", "Normalizing and comparing URLs...");

  const matched: AuditResult["matched"] = [];
  const missing: AuditResult["missing"] = [];
  const extra: AuditResult["extra"] = [];
  const broken: AuditResult["broken"] = [];
  const seoIssues: AuditResult["seoIssues"] = [];

  // Build lookup of Next.js slugs
  const nextSlugs = new Map<string, NextUrl>();
  for (const [path, entry] of nextUrls) {
    const slug = normalizeSlug(path);
    nextSlugs.set(slug, entry);
  }

  // Check each WP URL against Next.js
  for (const wp of wpUrls) {
    const slug = normalizeSlug(wp.slug);
    const nextEntry = nextSlugs.get(slug);

    if (!nextEntry) {
      missing.push({ slug, wpUrl: wp.url, type: wp.type, title: wp.title });
      logErr(`MISSING: /${slug}/ (${wp.type}: "${wp.title}")`);
      continue;
    }

    // Check status
    if (nextEntry.statusCode !== 200) {
      broken.push({ url: nextEntry.url, statusCode: nextEntry.statusCode, slug });
      logErr(`BROKEN: /${slug}/ → ${nextEntry.statusCode}`);
      continue;
    }

    // SEO comparison
    const issues: string[] = [];

    if (!nextEntry.title) {
      issues.push("Missing <title>");
    }
    if (!nextEntry.metaDescription) {
      issues.push("Missing meta description");
    }
    if (!nextEntry.canonical) {
      issues.push("Missing canonical URL");
    }
    if (nextEntry.hasNoindex) {
      issues.push("Has noindex (should be indexed!)");
    }

    // Compare with WP SEO if available
    if (wp.seo) {
      if (wp.seo.canonical && nextEntry.canonical) {
        const wpCanonical = normalizeUrl(wp.seo.canonical);
        const nextCanonical = normalizeUrl(nextEntry.canonical);
        if (wpCanonical !== nextCanonical) {
          issues.push(`Canonical mismatch: WP="${wp.seo.canonical}" vs Next="${nextEntry.canonical}"`);
        }
      }
    }

    const seoMatch = issues.length === 0;
    matched.push({ slug, wpUrl: wp.url, nextUrl: nextEntry.url, seoMatch });

    if (issues.length > 0) {
      seoIssues.push({ slug, url: nextEntry.url, issues });
      logWarn(`SEO issues on /${slug}/: ${issues.join(", ")}`);
    } else {
      logOk(`/${slug}/ ✓`);
    }
  }

  // Find extra Next.js URLs (not in WordPress)
  const wpSlugs = new Set(wpUrls.map(w => normalizeSlug(w.slug)));
  // Known Next.js-only routes
  const nextOnlyRoutes = new Set(["", "blog", "admin", "kfz-services", "kfz-service/kfz-online-service", "faq", "impressum", "datenschutzerklarung", "agb", "evb", "_not-found"]);

  for (const [path, entry] of nextUrls) {
    const slug = normalizeSlug(path);
    if (!wpSlugs.has(slug) && !nextOnlyRoutes.has(slug) && slug && !slug.startsWith("api/") && !slug.startsWith("_next")) {
      extra.push({ slug, nextUrl: entry.url });
    }
  }

  // Also check all Next.js pages for broken status
  for (const [path, entry] of nextUrls) {
    const slug = normalizeSlug(path);
    if (entry.statusCode !== 200 && entry.statusCode !== 0 && entry.statusCode !== 307 && entry.statusCode !== 308) {
      if (!broken.some(b => b.slug === slug)) {
        broken.push({ url: entry.url, statusCode: entry.statusCode, slug });
      }
    }
  }

  const result: AuditResult = {
    timestamp: new Date().toISOString(),
    summary: {
      wpTotal: wpUrls.length,
      nextTotal: nextUrls.size,
      matched: matched.length,
      missing: missing.length,
      extra: extra.length,
      broken: broken.length,
      seoIssues: seoIssues.length,
    },
    matched,
    missing,
    extra,
    broken,
    seoIssues,
  };

  return result;
}

// ═══════════════════════════════════════════════════════════
// PHASE 5: ADDITIONAL SEO VALIDATION
// ═══════════════════════════════════════════════════════════
async function validateSEO(nextUrls: Map<string, NextUrl>, result: AuditResult): Promise<void> {
  log("PHASE 5", "Running additional SEO validation...");

  for (const [path, entry] of nextUrls) {
    if (entry.statusCode !== 200) continue;
    const slug = normalizeSlug(path);
    if (!slug || slug.startsWith("api/") || slug.startsWith("_next") || slug === "admin") continue;

    const issues: string[] = [];
    if (!entry.title || entry.title.length < 10) issues.push(`Title too short or missing (${entry.title?.length || 0} chars)`);
    if (entry.title && entry.title.length > 70) issues.push(`Title too long (${entry.title.length} chars)`);
    if (!entry.metaDescription) issues.push("Missing meta description");
    if (entry.metaDescription && entry.metaDescription.length > 170) issues.push(`Meta description too long (${entry.metaDescription.length} chars)`);
    if (entry.hasNoindex) issues.push("noindex detected — page will NOT be indexed!");

    if (issues.length > 0 && !result.seoIssues.some(s => s.slug === slug)) {
      result.seoIssues.push({ slug, url: entry.url, issues });
    }
  }

  result.summary.seoIssues = result.seoIssues.length;
  logOk(`SEO validation complete: ${result.seoIssues.length} issues found`);
}

// ═══════════════════════════════════════════════════════════
// PHASE 6: REPORT GENERATION
// ═══════════════════════════════════════════════════════════
function generateReports(result: AuditResult): void {
  log("PHASE 6", "Generating reports...");

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // JSON report
  fs.writeFileSync(path.join(OUTPUT_DIR, "audit-report.json"), JSON.stringify(result, null, 2));
  logOk("audit-report.json saved");

  // HTML report
  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>iKFZ SEO Audit Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0f; color: #e0e0e0; padding: 40px; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 2rem; margin-bottom: 8px; color: #fff; }
    h2 { font-size: 1.4rem; margin: 32px 0 16px; color: #fff; border-bottom: 1px solid #222; padding-bottom: 8px; }
    .timestamp { color: #666; font-size: 0.85rem; margin-bottom: 32px; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 32px; }
    .stat { background: #111118; border: 1px solid #222; border-radius: 12px; padding: 20px; text-align: center; }
    .stat .num { font-size: 2.5rem; font-weight: 800; }
    .stat .label { color: #888; font-size: 0.85rem; margin-top: 4px; }
    .stat.ok .num { color: #22c55e; }
    .stat.warn .num { color: #f59e0b; }
    .stat.err .num { color: #ef4444; }
    .stat.info .num { color: #3b82f6; }
    .verdict { padding: 24px; border-radius: 12px; font-size: 1.2rem; font-weight: 700; text-align: center; margin-bottom: 32px; }
    .verdict.pass { background: #052e16; border: 2px solid #22c55e; color: #22c55e; }
    .verdict.fail { background: #2a0a0a; border: 2px solid #ef4444; color: #ef4444; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 0.9rem; }
    th, td { padding: 10px 14px; text-align: left; border-bottom: 1px solid #1a1a1a; }
    th { background: #111118; color: #888; font-weight: 600; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; }
    td { color: #ccc; }
    tr:hover td { background: #111118; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; }
    .badge.ok { background: #052e16; color: #22c55e; }
    .badge.err { background: #2a0a0a; color: #ef4444; }
    .badge.warn { background: #2a1f00; color: #f59e0b; }
    .issue-list { margin: 0; padding-left: 20px; }
    .issue-list li { color: #f59e0b; margin: 2px 0; }
    .slug { font-family: monospace; color: #818cf8; }
    .empty { text-align: center; padding: 40px; color: #444; }
  </style>
</head>
<body>
  <div class="container">
    <h1>�� iKFZ SEO Audit Report</h1>
    <div class="timestamp">Generated: ${result.timestamp}</div>

    <div class="stats">
      <div class="stat info"><div class="num">${result.summary.wpTotal}</div><div class="label">WordPress URLs</div></div>
      <div class="stat info"><div class="num">${result.summary.nextTotal}</div><div class="label">Next.js Pages</div></div>
      <div class="stat ok"><div class="num">${result.summary.matched}</div><div class="label">Matched ✓</div></div>
      <div class="stat ${result.summary.missing > 0 ? "err" : "ok"}"><div class="num">${result.summary.missing}</div><div class="label">Missing ✗</div></div>
      <div class="stat ${result.summary.broken > 0 ? "err" : "ok"}"><div class="num">${result.summary.broken}</div><div class="label">Broken ✗</div></div>
      <div class="stat ${result.summary.seoIssues > 0 ? "warn" : "ok"}"><div class="num">${result.summary.seoIssues}</div><div class="label">SEO Issues</div></div>
      <div class="stat warn"><div class="num">${result.summary.extra}</div><div class="label">Extra (Next only)</div></div>
    </div>

    <div class="verdict ${result.summary.missing === 0 && result.summary.broken === 0 ? "pass" : "fail"}">
      ${result.summary.missing === 0 && result.summary.broken === 0
        ? "✅ LAUNCH READY — No missing URLs, no broken links"
        : `🚫 LAUNCH BLOCKED — ${result.summary.missing} missing URL(s), ${result.summary.broken} broken link(s)`}
    </div>

    ${result.missing.length > 0 ? `
    <h2>❌ Missing URLs (${result.missing.length})</h2>
    <table>
      <thead><tr><th>Slug</th><th>Type</th><th>Title</th><th>WP URL</th></tr></thead>
      <tbody>${result.missing.map(m => `<tr><td class="slug">/${m.slug}/</td><td><span class="badge err">${m.type}</span></td><td>${m.title}</td><td>${m.wpUrl}</td></tr>`).join("")}</tbody>
    </table>` : ""}

    ${result.broken.length > 0 ? `
    <h2>💔 Broken URLs (${result.broken.length})</h2>
    <table>
      <thead><tr><th>Slug</th><th>Status</th><th>URL</th></tr></thead>
      <tbody>${result.broken.map(b => `<tr><td class="slug">/${b.slug}/</td><td><span class="badge err">${b.statusCode}</span></td><td>${b.url}</td></tr>`).join("")}</tbody>
    </table>` : ""}

    ${result.seoIssues.length > 0 ? `
    <h2>⚠️ SEO Issues (${result.seoIssues.length})</h2>
    <table>
      <thead><tr><th>Slug</th><th>Issues</th></tr></thead>
      <tbody>${result.seoIssues.map(s => `<tr><td class="slug">/${s.slug}/</td><td><ul class="issue-list">${s.issues.map(i => `<li>${i}</li>`).join("")}</ul></td></tr>`).join("")}</tbody>
    </table>` : ""}

    ${result.extra.length > 0 ? `
    <h2>📌 Extra URLs — Next.js Only (${result.extra.length})</h2>
    <table>
      <thead><tr><th>Slug</th><th>URL</th></tr></thead>
      <tbody>${result.extra.map(e => `<tr><td class="slug">/${e.slug}/</td><td>${e.nextUrl}</td></tr>`).join("")}</tbody>
    </table>` : ""}

    <h2>✅ Matched URLs (${result.matched.length})</h2>
    ${result.matched.length > 0 ? `
    <table>
      <thead><tr><th>Slug</th><th>SEO</th></tr></thead>
      <tbody>${result.matched.map(m => `<tr><td class="slug">/${m.slug}/</td><td><span class="badge ${m.seoMatch ? "ok" : "warn"}">${m.seoMatch ? "✓ OK" : "⚠ Issues"}</span></td></tr>`).join("")}</tbody>
    </table>` : '<div class="empty">No matched URLs</div>'}

    ${result.sitemapComparison ? `
    <h2>🗺️ Sitemap Comparison</h2>
    <div class="stats">
      <div class="stat ok"><div class="num">${result.sitemapComparison.inBoth.length}</div><div class="label">In Both</div></div>
      <div class="stat ${result.sitemapComparison.inWpOnly.length > 0 ? "warn" : "ok"}"><div class="num">${result.sitemapComparison.inWpOnly.length}</div><div class="label">WP Only</div></div>
      <div class="stat info"><div class="num">${result.sitemapComparison.inNextOnly.length}</div><div class="label">Next Only</div></div>
    </div>` : ""}
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(OUTPUT_DIR, "audit-report.html"), html);
  logOk("audit-report.html saved");
}

// ═══════════════════════════════════════════════════════════
// PHASE 8: SITEMAP COMPARISON
// ═══════════════════════════════════════════════════════════
async function compareSitemaps(result: AuditResult): Promise<void> {
  log("PHASE 8", "Comparing sitemaps...");

  const wpSitemapUrls = new Set<string>();
  const nextSitemapUrls = new Set<string>();

  // Fetch WP sitemap (try common patterns)
  for (const sitemapUrl of [`${WP_BASE}/sitemap.xml`, `${WP_BASE}/sitemap_index.xml`, `${WP_BASE}/wp-sitemap.xml`]) {
    try {
      const res = await fetchWithTimeout(sitemapUrl);
      if (!res.ok) continue;
      const xml = await res.text();
      const $ = cheerio.load(xml, { xmlMode: true });

      // Check for sitemap index
      const sitemapLocs: string[] = [];
      $("sitemap loc").each((_, el) => sitemapLocs.push($(el).text().trim()));

      if (sitemapLocs.length > 0) {
        // It is a sitemap index — fetch sub-sitemaps
        for (const subUrl of sitemapLocs) {
          try {
            const subRes = await fetchWithTimeout(subUrl);
            if (!subRes.ok) continue;
            const subXml = await subRes.text();
            const sub$ = cheerio.load(subXml, { xmlMode: true });
            sub$("url loc").each((_, el) => {
              const loc = sub$(el).text().trim();
              if (loc) wpSitemapUrls.add(normalizeUrl(loc));
            });
          } catch { /* skip */ }
        }
      } else {
        // Direct sitemap
        $("url loc").each((_, el) => {
          const loc = $(el).text().trim();
          if (loc) wpSitemapUrls.add(normalizeUrl(loc));
        });
      }
      if (wpSitemapUrls.size > 0) break;
    } catch { /* try next */ }
  }

  // Fetch Next.js sitemap
  try {
    const res = await fetchWithTimeout(`${NEXT_BASE}/sitemap.xml`);
    if (res.ok) {
      const xml = await res.text();
      const $ = cheerio.load(xml, { xmlMode: true });
      $("url loc").each((_, el) => {
        const loc = $(el).text().trim();
        if (loc) nextSitemapUrls.add(normalizeUrl(loc));
      });
    }
  } catch { logWarn("Could not fetch Next.js sitemap"); }

  const inWpOnly = [...wpSitemapUrls].filter(u => !nextSitemapUrls.has(u) && !SKIP_SLUGS.has(u.replace(/^\//, "")));
  const inNextOnly = [...nextSitemapUrls].filter(u => !wpSitemapUrls.has(u));
  const inBoth = [...wpSitemapUrls].filter(u => nextSitemapUrls.has(u));

  result.sitemapComparison = { inWpOnly, inNextOnly, inBoth };

  logOk(`Sitemap: ${inBoth.length} shared, ${inWpOnly.length} WP-only, ${inNextOnly.length} Next-only`);
}

// ═══════════════════════════════════════════════════════════
// PHASE 7: FAIL-SAFE SYSTEM
// ═══════════════════════════════════════════════════════════
function failSafe(result: AuditResult): boolean {
  log("PHASE 7", "Running fail-safe checks...");

  const criticalMissing = result.missing.filter(m => !SKIP_SLUGS.has(m.slug));
  const hasCriticalIssues = criticalMissing.length > 0 || result.broken.length > 0;

  if (hasCriticalIssues) {
    console.log("");
    console.log("\x1b[41m\x1b[37m ══════════════════════════════════════════════ \x1b[0m");
    console.log("\x1b[41m\x1b[37m   🚫 LAUNCH BLOCKED — CRITICAL ISSUES FOUND   \x1b[0m");
    console.log("\x1b[41m\x1b[37m ══════════════════════════════════════════════ \x1b[0m");
    console.log("");
    if (criticalMissing.length > 0) {
      logErr(`${criticalMissing.length} MISSING URL(s):`);
      criticalMissing.forEach(m => logErr(`  /${m.slug}/ — ${m.title}`));
    }
    if (result.broken.length > 0) {
      logErr(`${result.broken.length} BROKEN URL(s):`);
      result.broken.forEach(b => logErr(`  /${b.slug}/ → ${b.statusCode}`));
    }
    return false;
  }

  console.log("");
  console.log("\x1b[42m\x1b[30m ══════════════════════════════════════════════ \x1b[0m");
  console.log("\x1b[42m\x1b[30m   ✅ ALL CHECKS PASSED — READY FOR LAUNCH     \x1b[0m");
  console.log("\x1b[42m\x1b[30m ══════════════════════════════════════════════ \x1b[0m");
  console.log("");
  return true;
}

// ═══════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════
async function main() {
  console.log("");
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║       iKFZ SEO AUDIT SYSTEM — Automated         ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log("");

  const startTime = Date.now();

  // Phase 1: Fetch WordPress URLs
  const wpUrls = await fetchWordPressUrls();
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, "wordpress-urls.json"), JSON.stringify(wpUrls, null, 2));
  logOk("wordpress-urls.json saved");

  // Phase 2: Crawl Next.js
  const nextUrls = await crawlNextJs();
  const nextUrlsArr = Array.from(nextUrls.entries()).map(([path, entry]) => ({ path, ...entry }));
  fs.writeFileSync(path.join(OUTPUT_DIR, "nextjs-urls.json"), JSON.stringify(nextUrlsArr, null, 2));
  logOk("nextjs-urls.json saved");

  // Phase 3 + 4: Normalize + Compare
  const result = compareUrls(wpUrls, nextUrls);

  // Phase 5: SEO Validation
  await validateSEO(nextUrls, result);

  // Phase 8: Sitemap comparison
  await compareSitemaps(result);

  // Phase 6: Reports
  generateReports(result);

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("");
  log("SUMMARY", `Completed in ${elapsed}s`);
  log("SUMMARY", `WordPress: ${result.summary.wpTotal} URLs`);
  log("SUMMARY", `Next.js:   ${result.summary.nextTotal} pages crawled`);
  log("SUMMARY", `Matched:   ${result.summary.matched} ✅`);
  log("SUMMARY", `Missing:   ${result.summary.missing} ${result.summary.missing > 0 ? "❌" : "✅"}`);
  log("SUMMARY", `Broken:    ${result.summary.broken} ${result.summary.broken > 0 ? "❌" : "✅"}`);
  log("SUMMARY", `SEO Issues: ${result.summary.seoIssues} ${result.summary.seoIssues > 0 ? "⚠️" : "✅"}`);
  log("SUMMARY", `Extra:     ${result.summary.extra} ℹ️`);
  console.log("");

  // Phase 7: Fail-safe
  const passed = failSafe(result);

  process.exit(passed ? 0 : 1);
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
