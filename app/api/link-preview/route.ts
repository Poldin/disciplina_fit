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
  // Prova prima con property="og:xxx", poi name="xxx"
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

export async function GET(request: NextRequest) {
  // Solo utenti autenticati possono usare questo proxy
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

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(parsedUrl.href, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; DisciplinaFitBot/1.0; +https://disciplinafit.com)",
        Accept: "text/html",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({ error: "Fetch fallito" }, { status: 502 });
    }

    // Leggiamo solo i primi 50KB per non rallentare (i tag OG sono sempre in <head>)
    const reader = res.body?.getReader();
    if (!reader) throw new Error("no body");

    let html = "";
    let bytes = 0;
    const limit = 50 * 1024;
    while (bytes < limit) {
      const { done, value } = await reader.read();
      if (done) break;
      html += new TextDecoder().decode(value);
      bytes += value.byteLength;
    }
    reader.cancel();

    const origin = parsedUrl.origin;

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
        extractMeta(html, "og:site_name") ?? parsedUrl.hostname.replace(/^www\./, ""),
      favicon: `${origin}/favicon.ico`,
    };

    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  } catch (err) {
    console.error("[link-preview]", err);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}
