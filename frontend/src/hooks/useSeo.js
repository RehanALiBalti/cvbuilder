import { useEffect } from "react";
import {
  absoluteUrl,
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  SITE_NAME,
} from "../config/seo";

function upsertMeta(attr, key, content) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel, href) {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Lightweight per-page SEO. Sets title, description, canonical, robots and
 * Open Graph / Twitter tags. No external dependencies (works client-side; the
 * static tags in index.html are the crawler fallback before hydration).
 *
 * @param {object} opts
 * @param {string} [opts.title]
 * @param {string} [opts.description]
 * @param {string} [opts.path] Route path used to build the canonical URL.
 * @param {boolean} [opts.noindex] When true, mark the page noindex,nofollow.
 * @param {Array<object>} [opts.jsonLd] JSON-LD objects to inject.
 */
export default function useSeo({
  title,
  description,
  path,
  noindex = false,
  jsonLd,
} = {}) {
  useEffect(() => {
    const finalTitle = title || DEFAULT_TITLE;
    const finalDesc = description || DEFAULT_DESCRIPTION;
    const canonical = path ? absoluteUrl(path) : undefined;

    document.title = finalTitle;
    upsertMeta("name", "description", finalDesc);
    upsertMeta(
      "name",
      "robots",
      noindex ? "noindex, nofollow" : "index, follow",
    );

    if (canonical) upsertLink("canonical", canonical);

    // Open Graph
    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:title", finalTitle);
    upsertMeta("property", "og:description", finalDesc);
    if (canonical) upsertMeta("property", "og:url", canonical);

    // Twitter
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", finalTitle);
    upsertMeta("name", "twitter:description", finalDesc);

    // JSON-LD (page-scoped; removed on unmount)
    const nodes = [];
    if (Array.isArray(jsonLd)) {
      jsonLd.forEach((obj) => {
        const script = document.createElement("script");
        script.type = "application/ld+json";
        script.setAttribute("data-page-jsonld", "true");
        script.textContent = JSON.stringify(obj);
        document.head.appendChild(script);
        nodes.push(script);
      });
    }

    return () => {
      nodes.forEach((n) => n.remove());
    };
  }, [title, description, path, noindex, jsonLd]);
}
