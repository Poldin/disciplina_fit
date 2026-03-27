import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/app/utils/supabase/server";

export type LinkPreviewData = {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
};

function extractMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`,
      "i"
    ),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m?.[1]?.trim() ?? null;
}

function resolveUrl(base: string, relative: string): string {
  try {
    return new URL(relative, base).href;
  } catch {
    return relative;
  }
}

/** Risponde sempre con 200 + dati parziali — mai un errore HTTP che blocchi il componente */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const rawUrl = request.nextUrl.searchParams.get("url")?.trim();
  if (!rawUrl) {
    return NextResponse.json({ error: "url mancante" }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error();
  } catch {
    return NextResponse.json({ error: "URL non valido" }, { status: 400 });
  }

  const hostname = parsedUrl.hostname.replace(/^www\./, "");
  const origin = parsedUrl.origin;

  // Fallback minimo: mostriamo almeno il dominio anche se il fetch fallisce
  const fallback: LinkPreviewData = {
    url: parsedUrl.href,
    title: null,
    description: null,
    image: null,
    siteName: hostname,
    favicon: `${origin}/favicon.ico`,
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(parsedUrl.href, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "it-IT,it;q=0.9,en;q=0.8",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[link-preview] ${parsedUrl.href} → HTTP ${res.status}`);
      return NextResponse.json(fallback, {
        headers: { "Cache-Control": "public, max-age=3600" },
      });
    }

    // Leggi solo i primi 60KB — i tag OG sono sempre in <head>
    const reader = res.body?.getReader();
    if (!reader) return NextResponse.json(fallback);

    let html = "";
    let bytes = 0;
    const limit = 60 * 1024;
    while (bytes < limit) {
      const { done, value } = await reader.read();
      if (done) break;
      html += new TextDecoder().decode(value);
      bytes += value.byteLength;
      // Smetti di leggere appena troviamo </head>
      if (html.includes("</head>")) break;
    }
    reader.cancel();

    const data: LinkPreviewData = {
      url: parsedUrl.href,
      title:
        extractMeta(html, "og:title") ??
        extractMeta(html, "twitter:title") ??
        extractTitle(html),
      description:
        extractMeta(html, "og:description") ??
        extractMeta(html, "twitter:description") ??
        extractMeta(html, "description"),
      image: (() => {
        const img =
          extractMeta(html, "og:image") ??
          extractMeta(html, "twitter:image") ??
          extractMeta(html, "twitter:image:src");
        return img ? resolveUrl(origin, img) : null;
      })(),
      siteName:
        extractMeta(html, "og:site_name") ?? hostname,
      favicon: `${origin}/favicon.ico`,
    };

    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  } catch (err) {
    console.error("[link-preview] fetch error:", err);
    return NextResponse.json(fallback, {
      headers: { "Cache-Control": "public, max-age=60" },
    });
  }
}
