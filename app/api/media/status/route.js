import { NextResponse } from "next/server";
import { jobManager } from "@/lib/JobQueue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const id = request.nextUrl.searchParams.get("id") || "";

  if (!id) {
    return NextResponse.json({ status: "not_found" }, { status: 400 });
  }

  const info = jobManager.getJob(id);

  if (!info) {
    return NextResponse.json({ status: "not_found" });
  }

  // Strip filePath and cleanup function to prevent exposing server internals/secrets
  const clientInfo = {
    status: info.status,
    progress: info.progress,
    error: info.error,
    position: info.position // returns position in queue if status is "queued"
  };

  return NextResponse.json(clientInfo);
}
