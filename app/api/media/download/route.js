import path from "node:path";
import { stat } from "node:fs/promises";
import {
  createReadableStreamFromFile,
  getDownloadHeaders,
  inspectMedia,
  prepareDownloadFile,
  streamDownloadDirect,
  activeDownloads
} from "@/utils/server/ytDlp";
import { isValidSourceUrl, normalizeSourceUrl } from "@/utils/helpers";

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

  // 1. Handle serving pre-prepared file (Must be at the very top for instant response)
  if (readyOnly) {
    if (!downloadId) {
      return new Response("Missing download ID to retrieve file.", { status: 400 });
    }

    const entry = activeDownloads.get(downloadId);
    if (!entry) {
      return new Response("Download task not found or expired.", { status: 410 });
    }

    if (entry.status === "failed") {
      return new Response(entry.error || "The background preparation failed.", { status: 500 });
    }

    if (entry.status !== "completed" || !entry.filePath) {
      return new Response("File is not ready yet.", { status: 409 });
    }

    // Remove from activeDownloads immediately to prevent double cleanups or timeouts
    activeDownloads.delete(downloadId);

    const stream = createReadableStreamFromFile(entry.filePath, entry.cleanup);
    const filename = path.basename(entry.filePath);

    let size = 0;
    try {
      const stats = await stat(entry.filePath);
      size = stats.size;
    } catch (e) {
      console.error("Failed to stat completed file:", e);
    }

    return new Response(stream, {
      status: 200,
      headers: getDownloadHeaders({
        filename: filename.substring(0, filename.lastIndexOf('.')),
        ext: filename.substring(filename.lastIndexOf('.') + 1),
        size
      })
    });
  }

  if (!isValidSourceUrl(sourceUrl)) {
    return new Response("Paste a valid public URL before continuing.", { status: 400 });
  }

  try {
    const normalizedUrl = normalizeSourceUrl(sourceUrl);
    const media = await inspectMedia(normalizedUrl);
    const selectedFormat = media.formats.find((format) => format.selector === selector && format.mode === mode && format.ext === ext)
      || media.formats[0];

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

    // 2. Handle Background Preparation Trigger
    if (prepareOnly) {
      if (!downloadId) {
        return new Response("Missing download ID for background preparation.", { status: 400 });
      }

      // Start the download asynchronously in the background
      prepareDownloadFile({
        sourceUrl: normalizedUrl,
        selector: selectedFormat?.selector || selector,
        mode: selectedFormat?.mode || mode,
        ext: selectedFormat?.ext || ext,
        downloadId,
        recode: Boolean(selectedFormat?.needsRecode)
      }).catch((error) => {
        console.error(`Background preparation failed for ${downloadId}:`, error);
      });

      return new Response(JSON.stringify({ ok: true, status: "preparing" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 3. Fallback: Instant stream if direct, otherwise traditional synchronous behavior
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
    const stream = createReadableStreamFromFile(prepared.filePath, prepared.cleanup);

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
