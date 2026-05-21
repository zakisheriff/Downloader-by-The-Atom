import { NextResponse } from "next/server";
import { activeDownloads } from "@/utils/server/ytDlp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const id = request.nextUrl.searchParams.get("id") || "";

  if (!id) {
    return NextResponse.json({ status: "not_found" }, { status: 400 });
  }

  const info = activeDownloads.get(id);

  if (!info) {
    return NextResponse.json({ status: "not_found" });
  }

  // Strip filePath and cleanup function to prevent exposing server internals/secrets or causing serialization issues
  const clientInfo = {
    status: info.status,
    progress: info.progress,
    error: info.error
  };

  return NextResponse.json(clientInfo);
}
