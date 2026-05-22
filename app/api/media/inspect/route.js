import { NextResponse } from "next/server";
import { inspectMedia } from "@/utils/server/ytDlp";
import { isValidSourceUrl, normalizeSourceUrl } from "@/utils/helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const sourceUrl = request.nextUrl.searchParams.get("url") || "";

  if (!isValidSourceUrl(sourceUrl)) {
    return NextResponse.json(
      { error: "Paste a valid public URL before continuing." },
      { status: 400 }
    );
  }

  try {
    const media = await inspectMedia(normalizeSourceUrl(sourceUrl));
    
    // Hard-block any media longer than 30 minutes (1800 seconds)
    if (media.durationSeconds > 1800) {
      return NextResponse.json(
        { error: "Media exceeds maximum duration of 30 minutes for the free tier." },
        { status: 400 }
      );
    }

    return NextResponse.json({ media });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "This link could not be inspected." },
      { status: error.statusCode || 500 }
    );
  }
}
