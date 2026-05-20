import {
  createReadableStreamFromFile,
  getDownloadHeaders,
  inspectMedia,
  prepareDownloadFile
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
  const downloadId = request.nextUrl.searchParams.get("id") || "";

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

    const prepared = await prepareDownloadFile({
      sourceUrl: normalizedUrl,
      selector: selectedFormat?.selector || selector,
      mode: selectedFormat?.mode || mode,
      ext: selectedFormat?.ext || ext,
      downloadId
    });
    const stream = createReadableStreamFromFile(prepared.filePath, prepared.cleanup);

    return new Response(stream, {
      status: 200,
      headers: getDownloadHeaders({
        filename: media.title,
        ext: selectedFormat?.ext || "mp4"
      })
    });
  } catch (error) {
    return new Response(error.message || "The file could not be prepared.", {
      status: error.statusCode || 500
    });
  }
}
