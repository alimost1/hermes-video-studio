import { load } from "cheerio";
import { safeFetch } from "./safe-fetch";
import type { Source } from "../shared/schema";
export function parsePage(html: string, url: string): Source {
  const $ = load(html);
  const title =
    $('meta[property="og:title"]').attr("content") || $("title").text();
  const description =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    "";
  const candidates = [
    $('meta[property="og:image"]').attr("content"),
    ...$("main img, article img, img")
      .toArray()
      .map((e) => $(e).attr("src") || $(e).attr("data-src")),
  ];
  const images = [
    ...new Set(
      candidates.filter(Boolean).flatMap((v) => {
        try {
          const u = new URL(v!, url);
          return /^https?:$/.test(u.protocol) ? [u.href] : [];
        } catch {
          return [];
        }
      }),
    ),
  ].slice(0, 12);
  $("script,style,nav,footer,header,form,noscript,svg").remove();
  const main = $("main,article").first();
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
    text,
    images,
  };
}
export async function extract(url: string) {
  const result = await safeFetch(url);
  if (!result.contentType.includes("html"))
    throw new Error("The URL must point to an HTML page.");
  return parsePage(result.body.toString("utf8"), result.url);
}
