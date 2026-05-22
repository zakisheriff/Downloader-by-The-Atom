import path from "node:path";
import { stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import {
  getDownloadHeaders,
  inspectMedia,
  prepareDownloadFile,
  streamDownloadDirect
} from "@/utils/server/ytDlp";
import { isValidSourceUrl, normalizeSourceUrl } from "@/utils/helpers";
import { jobManager } from "@/lib/JobQueue";
import { rateLimiter } from "@/lib/RateLimiter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const sourceUrl = request.nextUrl.searchParams.get("url") || "";
  const selector = request.nextUrl.searchParams.get("format") || "best";
  const mode = request.nextUrl.searchParams.get("mode") || "direct";
  const ext = request.nextUrl.searchParams.get("ext") || "mp4";
  const validateOnly = request.nextUrl.searchParams.get("validate") === "true";
  const prepareOnly = request.nextUrl.searchParams.get("prepare") === "true";
  const readyOnly = request.nextUrl.searchParams.get("ready") === "true";
  const downloadId = request.nextUrl.searchParams.get("id") || "";

  // 1. Rate Limiting Check (Only on new download inspect/prepare/stream requests, not when retrieving completed files)
  if (!readyOnly && !validateOnly) {
    if (rateLimiter.isRateLimited(request)) {
      return new Response("Too many downloads. Limit is 5 per hour.", { status: 429 });
    }
  }

  // 2. Handle serving pre-prepared file (Must be at the very top for instant response)
  if (readyOnly) {
    if (!downloadId) {
      return new Response("Missing download ID to retrieve file.", { status: 400 });
    }

    const entry = jobManager.states.get(downloadId);
    if (!entry) {
      return new Response("Download task not found or expired.", { status: 410 });
    }

    if (entry.status === "failed") {
      return new Response(entry.error || "The background preparation failed.", { status: 500 });
    }

    if (entry.status !== "completed" || !entry.filePath) {
      return new Response("File is not ready yet.", { status: 409 });
    }

    const filename = path.basename(entry.filePath);
    let size = 0;
    try {
      const stats = await stat(entry.filePath);
      size = stats.size;
    } catch (e) {
      console.error("Failed to stat completed file:", e);
    }

    const headers = getDownloadHeaders({
      filename: filename.substring(0, filename.lastIndexOf('.')),
      ext: filename.substring(filename.lastIndexOf('.') + 1),
      size
    });

    // Handle HEAD request to return headers immediately without initiating stream or cleanups
    if (request.method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers
      });
    }

    // Do NOT delete the job entry immediately.
    // This protects against connection drops, range requests, and browser retries.
    // Instead, define a robust onFinish cleanup callback.
    const onFinish = async (success) => {
      if (success) {
        // Successful download: clean up files immediately
        console.log(`Download succeeded for session ${downloadId}. Cleaning up.`);
        try {
          await entry.cleanup();
        } catch (e) {
          console.error("Cleanup failed:", e);
        }
        jobManager.states.delete(downloadId);
      } else {
        // Failed or aborted download: wait 60 seconds before cleanup.
        // This gives the browser or download manager time to reconnect or retry.
        console.log(`Download interrupted for session ${downloadId}. Scheduling delayed cleanup in 60s.`);
        setTimeout(async () => {
          if (jobManager.states.has(downloadId)) {
            try {
              await entry.cleanup();
            } catch (e) {
              console.error("Delayed cleanup failed:", e);
            }
            jobManager.states.delete(downloadId);
          }
        }, 60_000);
      }
    };

    // High-performance streaming using stream.Readable.toWeb for flat memory usage with backpressure
    const nodeStream = createReadStream(entry.filePath);
    let cleaned = false;
    const triggerCleanup = async (success) => {
      if (cleaned) return;
      cleaned = true;
      await onFinish(success);
    };

    let ended = false;
    nodeStream.on("end", () => {
      ended = true;
    });
    nodeStream.on("close", () => {
      triggerCleanup(ended);
    });
    nodeStream.on("error", (err) => {
      console.error("Streaming read error:", err);
      triggerCleanup(false);
    });

    const stream = Readable.toWeb(nodeStream);

    return new Response(stream, {
      status: 200,
      headers
    });
  }

  if (!isValidSourceUrl(sourceUrl)) {
    return new Response("Paste a valid public URL before continuing.", { status: 400 });
  }

  try {
    const normalizedUrl = normalizeSourceUrl(sourceUrl);
    const media = await inspectMedia(normalizedUrl);
    
    // 3. Duration limit (Hard-block files > 30 minutes)
    if (media.durationSeconds > 1800) {
      return new Response("Media exceeds maximum duration of 30 minutes for the free tier.", { status: 400 });
    }

    const selectedFormat = media.formats.find(
      (format) => format.selector === selector && format.mode === mode && format.ext === ext
    ) || media.formats[0];

    if (selectedFormat?.disabled) {
      return new Response(
        selectedFormat.unavailableReason || "This format is not available on the current server.",
        { status: 409 }
      );
    }

    if (validateOnly) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 4. Handle Background Preparation Trigger with Queue
    if (prepareOnly) {
      if (!downloadId) {
        return new Response("Missing download ID for background preparation.", { status: 400 });
      }

      // Enqueue the task via the JobManager
      jobManager.enqueue(downloadId, () => prepareDownloadFile({
        sourceUrl: normalizedUrl,
        selector: selectedFormat?.selector || selector,
        mode: selectedFormat?.mode || mode,
        ext: selectedFormat?.ext || ext,
        downloadId,
        recode: Boolean(selectedFormat?.needsRecode)
      }));

      // Get current job state (could be queued or immediately running)
      const jobState = jobManager.getJob(downloadId);

      return new Response(
        JSON.stringify({
          ok: true,
          status: jobState?.status || "preparing",
          position: jobState?.position
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // 5. Fallback: Instant stream if direct, otherwise traditional synchronous behavior
    if (selectedFormat?.mode === "direct") {
      const stream = await streamDownloadDirect({
        sourceUrl: normalizedUrl,
        selector: selectedFormat?.selector || selector,
        ext: selectedFormat?.ext || ext
      });

      return new Response(stream, {
        status: 200,
        headers: getDownloadHeaders({
          filename: media.title,
          ext: selectedFormat?.ext || ext,
          size: selectedFormat?.sizeBytes
        })
      });
    }

    // Traditional fallback for other modes if client doesn't use the asynchronous prepare/ready flow
    const prepared = await prepareDownloadFile({
      sourceUrl: normalizedUrl,
      selector: selectedFormat?.selector || selector,
      mode: selectedFormat?.mode || mode,
      ext: selectedFormat?.ext || ext,
      downloadId,
      recode: Boolean(selectedFormat?.needsRecode)
    });

    // High-performance streaming using stream.Readable.toWeb with backpressure and immediate cleanup
    const nodeStream = createReadStream(prepared.filePath);
    let cleaned = false;
    nodeStream.on("close", async () => {
      if (cleaned) return;
      cleaned = true;
      await prepared.cleanup();
    });
    nodeStream.on("error", async (err) => {
      console.error("Fallback streaming error:", err);
      if (cleaned) return;
      cleaned = true;
      await prepared.cleanup();
    });

    const stream = Readable.toWeb(nodeStream);

    return new Response(stream, {
      status: 200,
      headers: getDownloadHeaders({
        filename: media.title,
        ext: selectedFormat?.ext || ext,
        size: selectedFormat?.sizeBytes
      })
    });
  } catch (error) {
    return new Response(error.message || "The file could not be prepared.", {
      status: error.statusCode || 500
    });
  }
}
