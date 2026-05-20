import os from "node:os";
import path from "node:path";
import { createReadStream } from "node:fs";
import { execFile, spawn } from "node:child_process";
import { mkdir, readdir, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import {
  formatBytes,
  formatDurationSeconds,
  formatSourceName,
  sanitizeFilename
} from "@/utils/helpers";

const execFileAsync = promisify(execFile);
const YT_DLP_BIN = process.env.YT_DLP_BIN || "yt-dlp";
const TMP_ROOT = path.join(os.tmpdir(), "fetch-by-the-atom");

function createYtError(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function createTempId() {
  return randomUUID();
}

function guessMimeType(ext = "") {
  const normalized = ext.toLowerCase();

  if (normalized === "mp4" || normalized === "m4v") {
    return "video/mp4";
  }

  if (normalized === "webm") {
    return "video/webm";
  }

  if (normalized === "mp3") {
    return "audio/mpeg";
  }

  if (normalized === "m4a") {
    return "audio/mp4";
  }

  if (normalized === "jpg" || normalized === "jpeg") {
    return "image/jpeg";
  }

  if (normalized === "png") {
    return "image/png";
  }

  return "application/octet-stream";
}

function normalizeExt(ext = "", fallback = "mp4") {
  return String(ext || fallback).toLowerCase();
}

function getCodecPriority(format) {
  const codec = String(format.vcodec || "").toLowerCase();

  if (codec.includes("avc") || codec.includes("h264")) {
    return 3;
  }

  if (codec.includes("vp9")) {
    return 2;
  }

  if (codec.includes("av01")) {
    return 1;
  }

  return 0;
}

function isPrimaryAudioTrack(format) {
  const note = String(format.format_note || "").toLowerCase();

  if (note.includes("drc")) {
    return false;
  }

  if (note.includes("original (default)")) {
    return true;
  }

  return !/-\d+$/.test(String(format.format_id || ""));
}

function pickBetterVideoFormat(current, next) {
  if (!current) {
    return next;
  }

  const currentProgressive = current.acodec !== "none";
  const nextProgressive = next.acodec !== "none";

  if (currentProgressive !== nextProgressive) {
    return nextProgressive ? next : current;
  }

  const currentCodec = getCodecPriority(current);
  const nextCodec = getCodecPriority(next);

  if (currentCodec !== nextCodec) {
    return nextCodec > currentCodec ? next : current;
  }

  return (next.tbr || 0) > (current.tbr || 0) ? next : current;
}

function sortByContainerThenQuality(groups = []) {
  return [...groups]
    .sort((first, second) => first.container.localeCompare(second.container))
    .map((group) => ({
      ...group,
      items: [...group.items].sort((first, second) => {
        if (first.type === "video") {
          return (second.qualityValue || 0) - (first.qualityValue || 0);
        }

        return (second.qualityValue || 0) - (first.qualityValue || 0);
      })
    }));
}

function buildVideoGroups(formats = []) {
  const bestPerVariant = new Map();

  for (const format of formats) {
    if (!format?.format_id || format.vcodec === "none" || !format.ext || format.ext === "mhtml") {
      continue;
    }

    const key = `${format.ext}:${format.height || 0}:${format.fps || 0}`;
    const current = bestPerVariant.get(key);
    bestPerVariant.set(key, pickBetterVideoFormat(current, format));
  }

  const grouped = new Map();

  for (const format of bestPerVariant.values()) {
    const progressive = format.acodec !== "none";
    const container = format.ext.toUpperCase();
    const resolution = format.height ? `${format.height}p` : format.format_note || "Video";
    const fps = format.fps ? `${format.fps}fps` : null;
    const mode = progressive ? "direct" : "merge";
    const note = progressive
      ? [resolution, fps, "ready with audio"].filter(Boolean).join(" • ")
      : [resolution, fps, "video merged with audio on the server"].filter(Boolean).join(" • ");
    const option = {
      id: `video:${format.format_id}:${mode}`,
      selector: progressive ? format.format_id : `${format.format_id}+bestaudio/best`,
      mode,
      type: "video",
      isAdaptive: !progressive,
      ext: normalizeExt(format.ext, "mp4"),
      container,
      label: resolution,
      note,
      qualityValue: format.height || 0,
      sizeBytes: format.filesize || format.filesize_approx || 0,
      sizeLabel: formatBytes(format.filesize || format.filesize_approx || 0),
      requiresServerSupport: !progressive
    };

    if (!grouped.has(container)) {
      grouped.set(container, {
        container,
        type: "video",
        items: []
      });
    }

    grouped.get(container).items.push(option);
  }

  return sortByContainerThenQuality([...grouped.values()]);
}

function buildAudioGroups(formats = []) {
  const primaryFormats = formats.filter((format) => (
    format?.format_id &&
    format.vcodec === "none" &&
    format.acodec !== "none" &&
    format.ext &&
    format.ext !== "mhtml" &&
    isPrimaryAudioTrack(format)
  ));

  const grouped = new Map();

  for (const format of primaryFormats) {
    const container = format.ext.toUpperCase();
    const bitrate = Math.round(format.abr || format.tbr || 0);
    const option = {
      id: `audio:${format.format_id}:direct`,
      selector: format.format_id,
      mode: "direct",
      type: "audio",
      ext: normalizeExt(format.ext, "m4a"),
      container,
      label: bitrate ? `${bitrate}kbps` : "Audio",
      note: "Original audio track",
      qualityValue: bitrate,
      sizeBytes: format.filesize || format.filesize_approx || 0,
      sizeLabel: formatBytes(format.filesize || format.filesize_approx || 0),
      requiresServerSupport: false
    };

    if (!grouped.has(container)) {
      grouped.set(container, {
        container,
        type: "audio",
        items: []
      });
    }

    grouped.get(container).items.push(option);
  }

  const mp3Group = {
    container: "MP3",
    type: "audio",
    items: [
      {
        id: "audio:bestaudio:extract-mp3",
        selector: "bestaudio/best",
        mode: "extract-audio",
        type: "audio",
        isAdaptive: false,
        ext: "mp3",
        container: "MP3",
        label: "Best available",
        note: "Converted to MP3 on the server",
        qualityValue: 999,
        sizeBytes: 0,
        sizeLabel: "Unknown",
        requiresServerSupport: true
      }
    ]
  };

  return sortByContainerThenQuality([...grouped.values(), mp3Group]);
}

function normalizeFormats(info) {
  const video = buildVideoGroups(info.formats || []);
  const audio = buildAudioGroups(info.formats || []);
  const flat = [...video.flatMap((group) => group.items), ...audio.flatMap((group) => group.items)];

  if (!flat.length) {
    const fallback = {
      id: "video:best:direct",
      selector: "best",
      mode: "direct",
      type: "video",
      isAdaptive: false,
      ext: normalizeExt(info.ext, "mp4"),
      container: String(info.ext || "file").toUpperCase(),
      label: `Best available ${String(info.ext || "file").toUpperCase()}`,
      note: "Let the server pick the best direct format",
      qualityValue: 0,
      sizeBytes: 0,
      sizeLabel: "Unknown",
      requiresServerSupport: false
    };

    return {
      video: [{ container: fallback.container, type: "video", items: [fallback] }],
      audio: [],
      flat: [fallback]
    };
  }

  return { video, audio, flat };
}

function applyServerAvailability(formats, serverWarning) {
  if (!serverWarning) {
    return formats;
  }

  const markItem = (item) => {
    if (item.type === "video" && item.isAdaptive) {
      return {
        ...item,
        disabled: true,
        unavailableReason: serverWarning,
        note: `${item.note} • currently unavailable on this server`
      };
    }

    return item;
  };

  const video = formats.video.map((group) => ({
    ...group,
    items: group.items.map(markItem)
  }));
  const audio = formats.audio.map((group) => ({
    ...group,
    items: group.items.map(markItem)
  }));
  const flat = [...video.flatMap((group) => group.items), ...audio.flatMap((group) => group.items)];

  return { video, audio, flat };
}

function normalizeWarningText(stderr = "") {
  const lower = stderr.toLowerCase();

  if (lower.includes("po token") || lower.includes("sabr streaming")) {
    return "Some higher YouTube qualities may need a newer yt-dlp build or a configured YouTube PO token on the server.";
  }

  return "";
}

export async function inspectMedia(sourceUrl) {
  try {
    const { stdout, stderr } = await execFileAsync(
      YT_DLP_BIN,
      ["--dump-single-json", "--no-warnings", "--no-playlist", "--skip-download", sourceUrl],
      { maxBuffer: 20 * 1024 * 1024 }
    );

    const info = JSON.parse(stdout);
    const baseFormats = normalizeFormats(info);
    const serverWarning = normalizeWarningText(stderr);
    const formats = applyServerAvailability(baseFormats, serverWarning);
    const title = sanitizeFilename(info.title || "Untitled media", "Untitled media");

    return {
      sourceUrl,
      title,
      description: info.description ? info.description.slice(0, 180) : null,
      thumbnail: info.thumbnail || info.thumbnails?.at?.(-1)?.url || null,
      sourceName: formatSourceName(info.extractor_key || info.extractor || info.webpage_url_domain || ""),
      durationLabel: formatDurationSeconds(info.duration),
      durationSeconds: info.duration || 0,
      uploader: info.uploader || info.channel || info.creator || null,
      uploadDate: info.upload_date || null,
      formats: formats.flat,
      formatGroups: {
        video: formats.video,
        audio: formats.audio
      },
      serverWarning
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      throw createYtError("yt-dlp is not installed on this server yet. Install yt-dlp and ffmpeg first.", 503);
    }

    const stderr = error.stderr?.trim();
    throw createYtError(stderr || "This link could not be inspected right now.", 400);
  }
}

function buildDownloadArgs({ sourceUrl, selector, mode, ext, outputTemplate }) {
  const args = ["--no-warnings", "--no-playlist"];

  if (mode === "extract-audio") {
    args.push(
      "-f",
      selector || "bestaudio/best",
      "-x",
      "--audio-format",
      normalizeExt(ext, "mp3"),
      "--audio-quality",
      "0",
      "-o",
      outputTemplate,
      sourceUrl
    );

    return args;
  }

  args.push("-f", selector || "best");

  if (mode === "merge") {
    args.push("--merge-output-format", normalizeExt(ext, "mp4"));
  }

  args.push("-o", outputTemplate, sourceUrl);
  return args;
}

function buildDownloadError(stderr = "") {
  const lower = stderr.toLowerCase();

  if (lower.includes("http error 403") || lower.includes("po token") || lower.includes("sabr")) {
    return createYtError(
      "This quality needs a newer yt-dlp build or extra YouTube server support before it can download reliably. Update yt-dlp first, then try again.",
      409
    );
  }

  return createYtError(stderr || "The download could not be prepared.", 500);
}

async function createTempOutputDir() {
  const dir = path.join(TMP_ROOT, createTempId());
  await mkdir(dir, { recursive: true });
  return dir;
}

async function locateCompletedFile(directoryPath) {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && !entry.name.endsWith(".part"))
    .map((entry) => path.join(directoryPath, entry.name));

  if (!files.length) {
    throw createYtError("The server could not find the finished media file.", 500);
  }

  return files[0];
}

export async function prepareDownloadFile({ sourceUrl, selector, mode, ext }) {
  const outputDir = await createTempOutputDir();
  const outputTemplate = path.join(outputDir, "%(title)s.%(ext)s");
  const args = buildDownloadArgs({
    sourceUrl,
    selector,
    mode,
    ext,
    outputTemplate
  });

  const child = spawn(YT_DLP_BIN, args, {
    stdio: ["ignore", "ignore", "pipe"]
  });

  const stderrChunks = [];
  child.stderr.on("data", (chunk) => {
    stderrChunks.push(Buffer.from(chunk));
  });

  const exitCode = await new Promise((resolve, reject) => {
    child.once("error", (error) => {
      if (error.code === "ENOENT") {
        reject(createYtError("yt-dlp is not installed on this server yet. Install yt-dlp and ffmpeg first.", 503));
        return;
      }

      reject(createYtError(error.message || "The download process could not start.", 500));
    });

    child.once("close", resolve);
  });

  if (exitCode !== 0) {
    const stderr = Buffer.concat(stderrChunks).toString("utf8").trim();
    await rm(outputDir, { recursive: true, force: true }).catch(() => null);
    throw buildDownloadError(stderr);
  }

  const filePath = await locateCompletedFile(outputDir);

  return {
    filePath,
    cleanup: async () => {
      await rm(outputDir, { recursive: true, force: true }).catch(() => null);
    }
  };
}

export function getDownloadHeaders({ filename, ext }) {
  const safeName = sanitizeFilename(filename, "download");
  const finalExt = normalizeExt(ext, "mp4");

  return {
    "Cache-Control": "no-store",
    "Content-Type": guessMimeType(finalExt),
    "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`${safeName}.${finalExt}`)}`
  };
}

export function createReadableStreamFromFile(filePath, onFinish) {
  const nodeStream = createReadStream(filePath);

  return new ReadableStream({
    start(controller) {
      nodeStream.on("data", (chunk) => {
        controller.enqueue(new Uint8Array(chunk));
      });

      nodeStream.on("end", async () => {
        controller.close();
        if (onFinish) {
          await onFinish();
        }
      });

      nodeStream.on("error", async (error) => {
        controller.error(error);
        if (onFinish) {
          await onFinish();
        }
      });
    },
    async cancel() {
      nodeStream.destroy();
      if (onFinish) {
        await onFinish();
      }
    }
  });
}
