import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Proxy thumbnails through our server so Instagram/Facebook CDN hotlink blocks
// don't show a broken image in the browser. The browser requests our URL,
// we fetch the real CDN URL server-side, and pipe the bytes back.
export async function GET(request) {
  const src = request.nextUrl.searchParams.get("src") || "";

  if (!src || !src.startsWith("http")) {
    return new Response("Missing or invalid src", { status: 400 });
  }

  try {
    const upstream = await fetch(src, {
      headers: {
        // Mimic a browser so CDNs that check Referer/User-Agent serve the image
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": new URL(src).origin + "/"
      }
    });

    if (!upstream.ok) {
      return new Response("Upstream image not available", { status: upstream.status });
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    const buffer = await upstream.arrayBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "Content-Length": String(buffer.byteLength)
      }
    });
  } catch (e) {
    return new Response("Failed to fetch thumbnail", { status: 502 });
  }
}
