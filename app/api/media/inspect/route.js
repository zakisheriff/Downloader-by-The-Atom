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
    
    // Dynamically enforce duration limit (defaulting to 12 hours / 43200 seconds)
    const maxDur = process.env.MAX_DURATION_SECONDS ? parseInt(process.env.MAX_DURATION_SECONDS, 10) : 43200;
    if (media.durationSeconds > maxDur) {
      const maxDurMinutes = Math.floor(maxDur / 60);
      const limitLabel = maxDurMinutes >= 60 
        ? `${(maxDurMinutes / 60).toFixed(1).replace(/\.0$/, "")} hours` 
        : `${maxDurMinutes} minutes`;
      return NextResponse.json(
        { error: `Media exceeds maximum duration of ${limitLabel} for the free tier.` },
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
