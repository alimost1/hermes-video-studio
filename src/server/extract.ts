import { load } from "cheerio";
import { safeFetch } from "./safe-fetch";
import type { Source } from "../shared/schema";
export function parsePage(
  html: string,
  url: string,
  style?: "property-reel",
): Source {
  const $ = load(html);
  const title =
    $('meta[property="og:title"]').attr("content") || $("title").text();
  const description =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    "";
  const property = style === "property-reel";
  const tel = property
    ? $('a[href^="tel:"],a[href*="wa.me/"]').first().attr("href")
    : undefined;
  const removeChrome = () =>
    $("script,style,nav,footer,header,form,noscript,svg").remove();
  if (property) {
    removeChrome();
    $(
      'aside, [class*="related" i], [id*="related" i], [class*="recommend" i], .sticky_side',
    ).remove();
  }
  const article = $("article").first();
  const main = $("main,article").first();
  const propertyRoot =
    article.find("img").length >= 2 ? article : main.length ? main : $("body");
  const candidates = (property ? propertyRoot.find("img") : $("img"))
    .toArray()
    .map((el) => {
      const img = $(el);
      const linked = property ? img.closest("a").attr("href") : "";
      const src =
        property && linked && /\.(jpe?g|png|webp)(?:[?#]|$)/i.test(linked)
          ? linked
          : property
            ? img.attr("data-src") || img.attr("src")
            : img.attr("src") || img.attr("data-src");
      return {
        src,
        label: (img.attr("alt") || img.attr("title") || "").slice(0, 120),
      };
    });
  const social = {
    src: $('meta[property="og:image"]').attr("content"),
    label: "",
  };
  if (property) candidates.push(social);
  else candidates.unshift(social);
  const gallery = new Map<string, string>();
  for (const { src, label } of candidates) {
    if (!src) continue;
    try {
      const image = new URL(src, url);
      if (!/^https?:$/.test(image.protocol)) continue;
      if (
        property &&
        /(?:logo|favicon|placeholder|banner|avatar|sprite)|\.svg$/i.test(
          image.pathname,
        )
      )
        continue;
      if (!gallery.has(image.href) || !gallery.get(image.href))
        gallery.set(image.href, label);
    } catch {
      /* Ignore malformed page image URLs. */
    }
  }
  const images = [...gallery.keys()].slice(0, property ? 24 : 12);
  if (!property) removeChrome();
  const text = (main.length ? main.text() : $("body").text())
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 18000);
  if (text.length < 100)
    throw new Error(
      "This page has too little readable content. Use a public article or listing page with server-rendered text.",
    );
  return {
    url,
    title: title.trim().slice(0, 200),
    description: description.slice(0, 1000),
    text: tel ? text + "\nListing contact: " + tel.slice(0, 128) : text,
    images,
    ...(property
      ? { imageLabels: images.map((key) => gallery.get(key) || "") }
      : {}),
  };
}
export async function extract(url: string, style?: "property-reel") {
  const result = await safeFetch(url);
  if (!result.contentType.includes("html"))
    throw new Error("The URL must point to an HTML page.");
  return parsePage(result.body.toString("utf8"), result.url, style);
}
