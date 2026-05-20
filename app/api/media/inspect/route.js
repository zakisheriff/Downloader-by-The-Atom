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
    return NextResponse.json({ media });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "This link could not be inspected." },
      { status: error.statusCode || 500 }
    );
  }
}
