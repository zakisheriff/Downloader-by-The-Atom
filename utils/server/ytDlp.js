import os from "node:os";
import path from "node:path";
import dns from "node:dns";
import { createReadStream, existsSync } from "node:fs";
import { execFile, execFileSync, spawn } from "node:child_process";
import { mkdir, readdir, rm, writeFile, readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";

if (dns && dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}
import {
  formatBytes,
  formatDurationSeconds,
  formatSourceName,
  sanitizeFilename
} from "@/utils/helpers";

const execFileAsync = promisify(execFile);
const YT_DLP_BIN = process.env.YT_DLP_BIN || "yt-dlp";
const TMP_ROOT = path.join(os.tmpdir(), "fetch-by-the-atom");
const ALLOW_YOUTUBE_ADAPTIVE = process.env.ALLOW_YOUTUBE_ADAPTIVE !== "false";
// Optional residential/mobile proxy for outbound yt-dlp requests (e.g. http://user:pass@host:port).
// Datacenter IPs (Vercel/Hugging Face) get blocked by YouTube far more than residential IPs;
// routing through a proxy is the only reliable long-term fix for that.
const YT_DLP_PROXY = process.env.YT_DLP_PROXY || "";

function getProxyArg() {
  return YT_DLP_PROXY ? ["--proxy", YT_DLP_PROXY] : [];
}

// The bgutil PO-token provider server (started in docker-entrypoint.sh) listens on
// 127.0.0.1:4416, but the yt-dlp plugin doesn't know that unless told explicitly via
// extractor-args. Without this, the plugin's request to the server never gets a response
// and yt-dlp hangs indefinitely (confirmed via diagnostic logs: SIGTERM-killed with zero
// stdout/stderr at both 14s and 30s timeouts — a true hang, not a slow request).
function getPotProviderArg() {
  return ["--extractor-args", "youtubepot-bgutilhttp:base_url=http://127.0.0.1:4416"];
}

// The right YouTube player client depends on whether a PO-token provider is reachable:
//
//   • Production (Docker) runs the bgutil POT server on 127.0.0.1:4416. With a PO token the
//     standard "tv,web" clients return the full adaptive ladder (up to 4K) and clear bot checks.
//   • Local dev usually has no POT server. There, "tv_embedded" is the only client that exposes
//     the full ladder without a PO token — but it was removed in newer yt-dlp builds and prints
//     'Skipping unsupported client "tv_embedded"'. Since prod always has POT, we never reach for
//     tv_embedded there, sidestepping that incompatibility.
//
// We probe the POT server once (result cached). The probe is async; inspectMedia awaits it
// before building args, and the sync builders read the cached value (defaulting to the POT
// path, which is the safe choice for any download that runs without a prior inspect).
let potAvailableCached = null;
async function ensurePotProbed() {
  if (potAvailableCached !== null) return potAvailableCached;
  try {
    // Any HTTP response (even 404) means the server is up. fetch only throws on a refused
    // connection or timeout, which is exactly the "no POT server" case we want to detect.
    await fetch("http://127.0.0.1:4416/ping", { method: "GET", signal: AbortSignal.timeout(1500) });
    potAvailableCached = true;
  } catch {
    potAvailableCached = false;
  }
  console.log(`ensurePotProbed: PO-token provider ${potAvailableCached ? "reachable" : "NOT reachable"} — using ${getPrimaryYouTubeClient()} as primary YouTube client.`);
  return potAvailableCached;
}

// Primary client for the high-quality attempt. Defaults to the POT path ("tv,web") until the
// probe has run, so it's never wrong on production.
function getPrimaryYouTubeClient() {
  return potAvailableCached === false ? "tv_embedded" : "tv,web";
}

// Fallback client set for the second attempt — widens reach for videos the primary set misses.
function getFallbackYouTubeClient() {
  return "android,mweb,web";
}

// Impersonate a real Chrome TLS/HTTP fingerprint via curl_cffi. Datacenter IPs (HF/Vercel)
// get their plain-Python TLS handshake dropped by YouTube ("TLS/SSL connection has been
// closed (EOF)") before any HTTP response — confirmed in the live verbose logs. Mimicking
// Chrome's fingerprint makes YouTube accept the connection. Can be disabled via env if a
// build ever ships without curl_cffi.
const YT_DLP_IMPERSONATE = process.env.YT_DLP_IMPERSONATE || "chrome";

// Whether the requested impersonate target is actually usable. curl_cffi (the backend that
// powers --impersonate) isn't installed in every environment — notably some local/Homebrew
// yt-dlp builds. Passing --impersonate when the target is unavailable makes yt-dlp abort
// immediately ("Impersonate target ... is not available"), breaking every request. We probe
// once (lazily, result cached) and silently drop the flag when the target can't be satisfied,
// so the app still works locally while keeping the Chrome fingerprint on datacenter IPs.
let impersonateAvailable = null;
function isImpersonateAvailable() {
  if (!YT_DLP_IMPERSONATE || YT_DLP_IMPERSONATE === "off") return false;
  if (impersonateAvailable === null) {
    try {
      const stdout = execFileSync(YT_DLP_BIN, ["--list-impersonate-targets"], { encoding: "utf8" });
      const target = YT_DLP_IMPERSONATE.toLowerCase();
      impersonateAvailable = stdout
        .split("\n")
        // A target line is only usable if it does NOT say "(unavailable)".
        .some((line) => line.toLowerCase().includes(target) && !line.toLowerCase().includes("unavailable"));
      if (!impersonateAvailable) {
        console.warn(`getImpersonateArg: impersonate target "${YT_DLP_IMPERSONATE}" is unavailable (curl_cffi missing?). Proceeding without it.`);
      }
    } catch (err) {
      console.warn("getImpersonateArg: could not probe impersonate targets, proceeding without it:", err?.message || err);
      impersonateAvailable = false;
    }
  }
  return impersonateAvailable;
}

function getImpersonateArg() {
  return isImpersonateAvailable() ? ["--impersonate", YT_DLP_IMPERSONATE] : [];
}

// In-memory cache for inspectMedia results. If many users paste the same trending video,
// we should hit YouTube once, not once per request — repeated identical requests from the
// same server IP are a big contributor to getting rate-limited.
const INSPECT_CACHE_TTL_MS = 10 * 60 * 1000;
if (!global.__inspectCache) {
  global.__inspectCache = new Map();
}
const inspectCache = global.__inspectCache;

function getCachedInspectResult(sourceUrl) {
  const entry = inspectCache.get(sourceUrl);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > INSPECT_CACHE_TTL_MS) {
    inspectCache.delete(sourceUrl);
    return null;
  }
  return entry.data;
}

function setCachedInspectResult(sourceUrl, data) {
  inspectCache.set(sourceUrl, { data, cachedAt: Date.now() });
}

// Run yt-dlp via spawn, capturing stdout to a buffer and streaming stderr to the console
// LIVE (line by line). This lets us see exactly where yt-dlp hangs even when we have to
// kill it on timeout — execFileAsync buffered stderr and lost it entirely on SIGTERM.
function runYtdlpStreamed(args, timeoutMs, label = "") {
  return new Promise((resolve, reject) => {
    const child = spawn(YT_DLP_BIN, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let stderrLineBuf = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      console.warn(`runYtdlpStreamed[${label}]: timeout after ${timeoutMs}ms — sending SIGKILL`);
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      stderrLineBuf += text;
      const lines = stderrLineBuf.split(/\r?\n/);
      stderrLineBuf = lines.pop() || "";
      for (const line of lines) {
        if (line.trim()) console.log(`yt-dlp[${label}] ${line}`);
      }
    });

    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      error.stderr = stderr;
      reject(error);
    });

    child.on("close", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (stderrLineBuf.trim()) console.log(`yt-dlp[${label}] ${stderrLineBuf}`);
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const error = new Error(`yt-dlp exited with code ${code}`);
        error.code = code;
        error.signal = signal;
        error.killed = signal === "SIGKILL" || signal === "SIGTERM";
        error.stderr = stderr;
        error.stdout = stdout;
        reject(error);
      }
    });
  });
}

// Persist across Next.js HMR hot-module reloads in dev.
// In production this is just a regular Map on the module.
if (!global.__activeDownloads) {
  global.__activeDownloads = new Map();
}
export const activeDownloads = global.__activeDownloads;

function convertJsonToNetscape(jsonContent) {
  let cookies;
  try {
    cookies = JSON.parse(jsonContent);
  } catch (e) {
    throw new Error("Failed to parse JSON cookie content: " + e.message);
  }

  // Check if it's the encrypted/internal backup format of Hotcleaner Cookie-Editor
  if (cookies && !Array.isArray(cookies) && typeof cookies === "object" && cookies.data) {
    throw new Error(
      "The provided cookies.json file is an encrypted Cookie-Editor backup. Please export your cookies as 'JSON' or 'Netscape' from the extension instead of creating a 'Backup' file."
    );
  }

  if (!Array.isArray(cookies)) {
    throw new Error("JSON cookies must be a JSON array of cookie objects.");
  }

  let output = "# Netscape HTTP Cookie File\n# This file was generated by fetch-by-the-atom converter\n\n";

  for (const cookie of cookies) {
    if (!cookie.name || !cookie.domain) {
      continue;
    }
    const domain = cookie.domain;
    const includeSubdomains = domain.startsWith(".") ? "TRUE" : "FALSE";
    const path = cookie.path || "/";
    const secure = cookie.secure ? "TRUE" : "FALSE";
    
    let expiration = 0;
    if (typeof cookie.expirationDate === "number") {
      expiration = Math.round(cookie.expirationDate);
    } else if (typeof cookie.expiry === "number") {
      expiration = Math.round(cookie.expiry);
    }
    
    const name = cookie.name;
    const value = cookie.value || "";

    output += `${domain}\t${includeSubdomains}\t${path}\t${secure}\t${expiration}\t${name}\t${value}\n`;
  }

  return output;
}

let lastProcessedBase64 = null;

async function getCookiesArg(sourceUrl, forceCookies = false) {
  const isYouTube = sourceUrl && (sourceUrl.includes("youtube.com") || sourceUrl.includes("youtu.be"));
  if (isYouTube && !forceCookies) {
    console.log("getCookiesArg: Bypassing cookies for YouTube URL by default");
    return [];
  }

  const tmpTxtPath = path.join(os.tmpdir(), "fetch-by-the-atom-cookies.txt");
  
  console.log("getCookiesArg: Checking cookies configuration...");
  // 1. Decode/convert from environment variable if available
  if (process.env.YT_DLP_COOKIES_BASE64) {
    const rawLen = process.env.YT_DLP_COOKIES_BASE64.length;
    console.log(`getCookiesArg: YT_DLP_COOKIES_BASE64 env var found. Length: ${rawLen}`);
    if (process.env.YT_DLP_COOKIES_BASE64 !== lastProcessedBase64 || !existsSync(tmpTxtPath)) {
      try {
        // Clean all whitespace from the environment variable
        const cleanBase64 = process.env.YT_DLP_COOKIES_BASE64.replace(/\s/g, "");
        console.log(`getCookiesArg: Cleaned base64 length: ${cleanBase64.length}`);
        // Split by base64 delimiters (comma, semicolon) or padding (=, ==) to handle concatenated values
        const chunks = cleanBase64.split(/[,;=]+/).filter(Boolean);
        
        let mergedCookiesContent = "# Netscape HTTP Cookie File\n# This file was generated by fetch-by-the-atom converter\n\n";
        let processedCount = 0;
        
        for (const chunk of chunks) {
          const decoded = Buffer.from(chunk, "base64").toString("utf-8").trim();
          if (!decoded) continue;
          
          const isJson = decoded.startsWith("[") || decoded.startsWith("{");
          if (isJson) {
            try {
              const converted = convertJsonToNetscape(decoded);
              // Strip header comment lines if any, to merge cleanly
              const cleanConverted = converted.replace(/^(#.*?\n)*/s, "");
              mergedCookiesContent += `\n# Cookies Chunk ${processedCount + 1} (JSON converted)\n` + cleanConverted;
              processedCount++;
            } catch (jsonErr) {
              console.warn(`getCookiesArg: Chunk ${processedCount + 1} looked like JSON but failed to convert:`, jsonErr.message);
              // Fall back to treating it as Netscape/plain text
              const cleanContent = decoded.replace(/^(#.*?\n)*/s, "");
              mergedCookiesContent += `\n# Cookies Chunk ${processedCount + 1} (Plain Text Fallback)\n` + cleanContent;
              processedCount++;
            }
          } else {
            const cleanContent = decoded.replace(/^(#.*?\n)*/s, "");
            mergedCookiesContent += `\n# Cookies Chunk ${processedCount + 1} (Netscape Format)\n` + cleanContent;
            processedCount++;
          }
        }
        
        if (processedCount === 0) {
          throw new Error("No valid cookie content could be decoded from YT_DLP_COOKIES_BASE64.");
        }
        
        const sanitizedContent = mergedCookiesContent.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
        await writeFile(tmpTxtPath, sanitizedContent, "utf-8");
        lastProcessedBase64 = process.env.YT_DLP_COOKIES_BASE64;
        console.log(`getCookiesArg: Successfully processed and merged ${processedCount} cookie chunks from environment variable.`);
      } catch (e) {
        console.error("getCookiesArg: Failed to process YT_DLP_COOKIES_BASE64:", e);
        throw new Error(`Failed to process environment cookies: ${e.message}`);
      }
    }
    
    if (existsSync(tmpTxtPath)) {
      console.log("getCookiesArg: Using environment cookies file.");
      return ["--cookies", tmpTxtPath];
    }
  } else {
    console.log("getCookiesArg: YT_DLP_COOKIES_BASE64 env var NOT found.");
  }
  
  // 2. Check for local cookie files (JSON preferred, then Netscape txt)
  let localFiles = [];
  try {
    const files = await readdir(process.cwd());
    for (const file of files) {
      const lower = file.toLowerCase();
      if (lower.endsWith("cookies.json") || lower.endsWith("cookie.json")) {
        localFiles.push({ path: path.join(process.cwd(), file), isJson: true, name: file, priority: 1 });
      } else if (lower.endsWith("cookies.txt") || lower.endsWith("cookie.txt")) {
        localFiles.push({ path: path.join(process.cwd(), file), isJson: false, name: file, priority: 2 });
      }
    }
    // Sort so JSON files are processed before TXT files
    localFiles.sort((a, b) => a.priority - b.priority);
  } catch (e) {
    console.error("Failed to read local directory for cookies:", e);
  }
  
  let lastError = null;
  let mergedCookiesContent = "# Netscape HTTP Cookie File\n# This file was generated by fetch-by-the-atom converter\n\n";
  let loadedCount = 0;

  for (const item of localFiles) {
    if (existsSync(item.path)) {
      try {
        const content = await readFile(item.path, "utf-8");
        const trimmed = content.trim();
        if (!trimmed) continue;
        const isJson = trimmed.startsWith("[") || trimmed.startsWith("{");
        
        if (isJson) {
          const converted = convertJsonToNetscape(trimmed);
          const cleanConverted = converted.replace(/^(#.*?\n)*/s, "");
          mergedCookiesContent += `\n# Cookies from ${item.name}\n` + cleanConverted;
          loadedCount++;
          console.log(`Successfully converted and merged cookies from local file: ${item.name}`);
        } else {
          const cleanContent = trimmed.replace(/^(#.*?\n)*/s, "");
          mergedCookiesContent += `\n# Cookies from ${item.name}\n` + cleanContent;
          loadedCount++;
          console.log(`Successfully merged cookies from local Netscape file: ${item.name}`);
        }
      } catch (e) {
        console.error(`Failed to process local cookie file at ${item.path}:`, e.message);
        lastError = e;
      }
    }
  }

  if (loadedCount > 0) {
    const sanitizedContent = mergedCookiesContent.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
    await writeFile(tmpTxtPath, sanitizedContent, "utf-8");
    console.log(`Successfully merged and loaded ${loadedCount} cookie files.`);
    return ["--cookies", tmpTxtPath];
  }

  if (lastError) {
    throw lastError;
  }
  
  // 3. Fallback to existing tmpTxtPath if neither env nor local files are found/valid
  if (existsSync(tmpTxtPath)) {
    return ["--cookies", tmpTxtPath];
  }
  
  return [];
}

async function hasCookiesConfigured() {
  if (process.env.YT_DLP_COOKIES_BASE64) {
    return true;
  }
  try {
    const files = await readdir(process.cwd());
    for (const file of files) {
      const lower = file.toLowerCase();
      if (
        lower.endsWith("cookies.json") ||
        lower.endsWith("cookie.json") ||
        lower.endsWith("cookies.txt") ||
        lower.endsWith("cookie.txt")
      ) {
        return true;
      }
    }
  } catch (e) {
    // Ignore error
  }
  return false;
}

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

function isYouTubeLikeSource(value = "") {
  const normalized = String(value || "").toLowerCase();
  return normalized.includes("youtube") || normalized.includes("youtu.be");
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

function estimateSizeBytes(format, durationSeconds = 0) {
  // Prefer exact filesize, then approximate filesize
  if (format.filesize && format.filesize > 0) return format.filesize;
  if (format.filesize_approx && format.filesize_approx > 0) return format.filesize_approx;
  // Fall back to bitrate × duration estimation (tbr is in kbps)
  const tbr = format.tbr || format.vbr || 0;
  if (tbr > 0 && durationSeconds > 0) {
    return Math.round((tbr * 1000 / 8) * durationSeconds);
  }
  return 0;
}

function getResolutionSuffix(height) {
  if (height >= 2160) return " (4K)";
  if (height >= 1440) return " (2K)";
  if (height >= 1080) return " (Full HD)";
  if (height >= 720) return " (HD)";
  return "";
}

function buildVideoGroups(formats = [], durationSeconds = 0) {
  const bestPerVariant = new Map();

  for (const format of formats) {
    if (!format?.format_id || format.vcodec === "none" || !format.ext || format.ext === "mhtml") {
      continue;
    }

    const key = `${format.ext}:${format.height || 0}:${format.fps || 0}`;
    const current = bestPerVariant.get(key);
    bestPerVariant.set(key, pickBetterVideoFormat(current, format));
  }

  // Find the single best progressive format per container to mark as "(Recommended)"
  const bestProgressivePerContainer = new Map();
  for (const format of bestPerVariant.values()) {
    const progressive = format.acodec !== "none";
    if (progressive) {
      const container = format.ext.toUpperCase();
      const currentBest = bestProgressivePerContainer.get(container);
      if (!currentBest) {
        bestProgressivePerContainer.set(container, format);
      } else {
        const currentBestHeight = currentBest.height || 0;
        const formatHeight = format.height || 0;
        if (formatHeight > currentBestHeight) {
          bestProgressivePerContainer.set(container, format);
        } else if (formatHeight === currentBestHeight) {
          const currentBestTbr = currentBest.tbr || 0;
          const formatTbr = format.tbr || 0;
          if (formatTbr > currentBestTbr) {
            bestProgressivePerContainer.set(container, format);
          }
        }
      }
    }
  }

  const grouped = new Map();

  for (const format of bestPerVariant.values()) {
    const progressive = format.acodec !== "none";
    const container = format.ext.toUpperCase();
    const resolution = format.height ? `${format.height}p` : format.format_note || "Video";
    const fps = format.fps ? `${format.fps}fps` : null;
    const mode = progressive ? "direct" : "merge";

    // We disable CPU-heavy video transcoding (e.g. VP9/AV1 to H.264) on the server.
    // Transcoding high resolution (1080p, 1440p, 4K) videos on a cloud container
    // causes high CPU usage, timeouts, and failures. Stream copy is instant and lossless.
    const needsRecode = false;

    const note = progressive
      ? [resolution, fps, "Ready with audio"].filter(Boolean).join(" • ")
      : [resolution, fps, "Server merge required"].filter(Boolean).join(" • ");
    const sizeBytes = estimateSizeBytes(format, durationSeconds);
    const labelBase = format.height ? `${format.height}p${getResolutionSuffix(format.height)}` : format.format_note || "Video";
    
    const isRecommended = progressive && bestProgressivePerContainer.get(container) === format;

    const option = {
      id: `video:${format.format_id}:${mode}`,
      selector: progressive ? format.format_id : `${format.format_id}+bestaudio/best`,
      mode,
      type: "video",
      isAdaptive: !progressive,
      needsRecode,
      ext: normalizeExt(format.ext, "mp4"),
      container,
      label: isRecommended ? `${labelBase} (Recommended)` : labelBase,
      note,
      qualityValue: format.height || 0,
      sizeBytes,
      sizeLabel: formatBytes(sizeBytes),
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

function buildAudioGroups(formats = [], durationSeconds = 0) {
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
    const sizeBytes = estimateSizeBytes(format, durationSeconds);
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
      sizeBytes,
      sizeLabel: formatBytes(sizeBytes),
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

  // Estimate MP3 size from the best available audio bitrate × duration
  const bestAudioBitrate = Math.max(
    ...primaryFormats.map((f) => f.abr || f.tbr || 0).filter(Boolean),
    0
  );
  const mp3SizeBytes = bestAudioBitrate > 0 && durationSeconds > 0
    ? Math.round((bestAudioBitrate * 1000 / 8) * durationSeconds)
    : 0;

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
        sizeBytes: mp3SizeBytes,
        sizeLabel: mp3SizeBytes > 0 ? `~${formatBytes(mp3SizeBytes)}` : "Unknown",
        requiresServerSupport: true
      }
    ]
  };

  return sortByContainerThenQuality([...grouped.values(), mp3Group]);
}

function normalizeFormats(info) {
  const durationSeconds = info.duration || 0;
  const video = buildVideoGroups(info.formats || [], durationSeconds);
  const audio = buildAudioGroups(info.formats || [], durationSeconds);
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

function applyServerAvailability(formats, { serverWarning = "", sourceUrl = "", sourceName = "" } = {}) {
  const blockAdaptiveYouTube = !ALLOW_YOUTUBE_ADAPTIVE && (
    isYouTubeLikeSource(sourceUrl) || isYouTubeLikeSource(sourceName)
  );
  // Only the explicit env-based block disables formats. A PO-token/SABR warning in stderr is
  // NOT a reason to disable: with the tv_embedded client the adaptive formats come back with
  // real https URLs that merge fine via ffmpeg, so disabling them on a soft warning hid usable
  // 1440p/4K qualities. The warning is still surfaced separately as an informational note.
  const adaptiveReason = blockAdaptiveYouTube
    ? "Higher YouTube qualities like 1080p, 1440p, and 4K are disabled on this server because they need extra YouTube download support. Use a direct quality here, or upgrade the server setup first."
    : "";

  if (!adaptiveReason) {
    return formats;
  }

  const markItem = (item) => {
    if (item.type === "video" && item.isAdaptive) {
      return {
        ...item,
        disabled: true,
        unavailableReason: adaptiveReason,
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

function shortcodeToId(shortcode) {
  let id = BigInt(0);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  for (let i = 0; i < shortcode.length; i++) {
    const char = shortcode[i];
    const value = alphabet.indexOf(char);
    if (value === -1) {
      throw new Error(`Invalid character in shortcode: ${char}`);
    }
    id = id * BigInt(64) + BigInt(value);
  }
  return id.toString();
}

async function getInstagramCookieString() {
  let instagramCookies = [];
  
  // 1. Check env var
  if (process.env.YT_DLP_COOKIES_BASE64) {
    try {
      const cleanBase64 = process.env.YT_DLP_COOKIES_BASE64.replace(/\s/g, "");
      const chunks = cleanBase64.split(/[,;=]+/).filter(Boolean);
      for (const chunk of chunks) {
        const decoded = Buffer.from(chunk, "base64").toString("utf-8").trim();
        if (!decoded) continue;
        const isJson = decoded.startsWith("[") || decoded.startsWith("{");
        if (isJson) {
          try {
            const parsed = JSON.parse(decoded);
            if (Array.isArray(parsed)) {
              const filtered = parsed.filter(c => c.domain && c.domain.includes("instagram.com"));
              instagramCookies.push(...filtered);
            }
          } catch {}
        } else {
          // Netscape parser for environment cookie chunks
          const lines = decoded.split("\n");
          for (const line of lines) {
            if (line.startsWith("#") || !line.trim()) continue;
            const parts = line.split("\t");
            if (parts.length >= 7) {
              const domain = parts[0];
              const name = parts[5];
              const value = parts[6]?.trim() || "";
              if (domain.includes("instagram.com")) {
                instagramCookies.push({ name, value, domain });
              }
            }
          }
        }
      }
    } catch (e) {
      console.error("Error parsing YT_DLP_COOKIES_BASE64 for Instagram:", e);
    }
  }
  
  // 2. Read local files
  try {
    const files = await readdir(process.cwd());
    for (const file of files) {
      const lower = file.toLowerCase();
      if (lower.includes("instagram") && (lower.endsWith(".json") || lower.endsWith(".txt"))) {
        const content = await readFile(path.join(process.cwd(), file), "utf-8");
        if (lower.endsWith(".json")) {
          try {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) {
              instagramCookies.push(...parsed);
            }
          } catch {}
        } else {
          // Netscape parser
          const lines = content.split("\n");
          for (const line of lines) {
            if (line.startsWith("#") || !line.trim()) continue;
            const parts = line.split("\t");
            if (parts.length >= 7) {
              const domain = parts[0];
              const name = parts[5];
              const value = parts[6]?.trim() || "";
              if (domain.includes("instagram.com")) {
                instagramCookies.push({ name, value, domain });
              }
            }
          }
        }
      }
    }
  } catch (e) {
    console.error("Error scanning local files for Instagram cookies:", e);
  }

  // Also fall back to general local cookie files if no specific instagram ones found
  if (instagramCookies.length === 0) {
    try {
      const files = await readdir(process.cwd());
      for (const file of files) {
        const lower = file.toLowerCase();
        if ((lower.endsWith("cookies.json") || lower.endsWith("cookie.json")) && !lower.includes("youtube")) {
          const content = await readFile(path.join(process.cwd(), file), "utf-8");
          try {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) {
              const filtered = parsed.filter(c => c.domain && c.domain.includes("instagram.com"));
              instagramCookies.push(...filtered);
            }
          } catch {}
        }
      }
    } catch {}
  }
  
  if (instagramCookies.length > 0) {
    // Deduplicate by name
    const unique = [];
    const seen = new Set();
    for (const c of instagramCookies) {
      if (!seen.has(c.name)) {
        seen.add(c.name);
        unique.push(`${c.name}=${c.value}`);
      }
    }
    return unique.join("; ");
  }
  
  return "";
}

async function fetchInstagramMediaInfo(shortcode) {
  const mediaId = shortcodeToId(shortcode);
  
  // Endpoints to try in order of reliability
  const urls = [
    `https://i.instagram.com/api/v1/media/${mediaId}/info/`,
    `https://www.instagram.com/api/v1/media/${mediaId}/info/`,
    `https://www.instagram.com/p/${shortcode}/?__a=1&__d=dis`
  ];

  const cookieString = await getInstagramCookieString();
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "X-IG-App-ID": "936619743392459",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin"
  };
  if (cookieString) {
    headers["Cookie"] = cookieString;
  } else {
    console.warn("fetchInstagramMediaInfo: No Instagram cookies found. Request may fail.");
  }

  const isHuggingFace = Boolean(process.env.SPACE_ID || process.env.SPACE_HOST);

  // Step 1: Try native fetch (skip on Hugging Face — Node.js fetch always times out there)
  if (!isHuggingFace) {
    for (const url of urls) {
      console.log(`fetchInstagramMediaInfo: Trying native fetch: ${url}`);
      try {
        const res = await fetch(url, { headers, signal: AbortSignal.timeout(6000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const item = data.items?.[0] || data.graphql?.shortcode_media;
        if (item) return item;
        throw new Error("No media items returned.");
      } catch (e) {
        console.warn(`fetchInstagramMediaInfo: Native fetch failed for ${url}:`, e.message);
      }
    }
  } else {
    console.log("fetchInstagramMediaInfo: Hugging Face environment detected — skipping native fetch (known to timeout).");
  }

  // Step 2: Python urllib fallback (uses the same networking stack as yt-dlp)
  // On Hugging Face, Node.js fetch and curl both get ConnectTimeoutError to instagram.com,
  // but yt-dlp (Python/urllib) connects successfully. So we use Python as our HTTP client.
  console.log("fetchInstagramMediaInfo: All native fetch attempts failed. Trying Python urllib fallback...");

  for (const url of urls) {
    console.log(`fetchInstagramMediaInfo: Trying Python urllib for: ${url}`);
    try {
      const headersJson = JSON.stringify(headers);
      // Inline Python script that uses urllib.request (same stack as yt-dlp)
      const pyScript = `
import urllib.request, json, sys, ssl
ctx = ssl.create_default_context()
headers = json.loads(sys.argv[1])
req = urllib.request.Request(sys.argv[2], headers=headers)
try:
    resp = urllib.request.urlopen(req, timeout=8, context=ctx)
    sys.stdout.write(resp.read().decode('utf-8'))
except Exception as e:
    sys.stderr.write(str(e))
    sys.exit(1)
`.trim();

      const { stdout, stderr } = await execFileAsync("python3", ["-c", pyScript, headersJson, url], {
        timeout: 12000,
        maxBuffer: 5 * 1024 * 1024
      });

      if (!stdout || !stdout.trim()) {
        throw new Error(stderr ? `Python error: ${stderr.trim()}` : "Python returned empty response.");
      }

      const data = JSON.parse(stdout);
      const item = data.items?.[0] || data.graphql?.shortcode_media;
      if (item) {
        console.log("fetchInstagramMediaInfo: Python urllib succeeded!");
        return item;
      }
      throw new Error("No media items in Python response.");
    } catch (pyError) {
      console.error(`fetchInstagramMediaInfo: Python urllib failed for ${url}:`, pyError.message);
    }
  }

  throw new Error("All Instagram API fetch strategies (native fetch + Python urllib) failed for all endpoints.");
}

function getInstagramDimensions(item, mediaObj, prioritizeOriginal = false) {
  let width = 0;
  let height = 0;

  if (prioritizeOriginal) {
    width = item?.original_width || mediaObj?.width || 0;
    height = item?.original_height || mediaObj?.height || 0;
  } else {
    width = mediaObj?.width || item?.original_width || 0;
    height = mediaObj?.height || item?.original_height || 0;
  }

  if (!width || !height) {
    const url = mediaObj?.url || "";
    const match = url.match(/_(\d+)x(\d+)_/);
    if (match) {
      width = parseInt(match[1], 10);
      height = parseInt(match[2], 10);
    }
  }
  return { width, height };
}

function normalizeInstagramItem(raw) {
  // Private API format (items[0]) already has the right fields — return as-is.
  if (raw.media_type !== undefined) return raw;

  // GraphQL format (graphql.shortcode_media) uses different field names.
  // Normalize it into the private API shape so the rest of the parser works.
  const typename = raw.__typename || "";
  let media_type = 1; // default: image
  if (typename === "GraphVideo") media_type = 2;
  else if (typename === "GraphSidecar") media_type = 8;

  const captionEdges = raw.edge_media_to_caption?.edges || [];
  const captionText = captionEdges[0]?.node?.text || null;

  const owner = raw.owner || {};
  const user = { username: owner.username || null, full_name: owner.full_name || null };

  // Build image_versions2 from display_url (highest quality)
  const displayUrl = raw.display_url || null;
  const image_versions2 = displayUrl
    ? { candidates: [{ url: displayUrl, width: raw.dimensions?.width || 0, height: raw.dimensions?.height || 0 }] }
    : null;

  // Build video_versions from video_url
  const videoUrl = raw.video_url || null;
  const video_versions = videoUrl
    ? [{ url: videoUrl, width: raw.dimensions?.width || 0, height: raw.dimensions?.height || 0 }]
    : [];

  // Build carousel_media from edge_sidecar_to_children
  const sidecarEdges = raw.edge_sidecar_to_children?.edges || [];
  const carousel_media = sidecarEdges.map(edge => {
    const node = edge.node || {};
    const nodeType = node.__typename || "";
    const nodeMediaType = nodeType === "GraphVideo" ? 2 : 1;
    const nodeDisplayUrl = node.display_url || null;
    const nodeVideoUrl = node.video_url || null;
    return {
      media_type: nodeMediaType,
      image_versions2: nodeDisplayUrl
        ? { candidates: [{ url: nodeDisplayUrl, width: node.dimensions?.width || 0, height: node.dimensions?.height || 0 }] }
        : null,
      video_versions: nodeVideoUrl
        ? [{ url: nodeVideoUrl, width: node.dimensions?.width || 0, height: node.dimensions?.height || 0 }]
        : [],
      original_width: node.dimensions?.width || 0,
      original_height: node.dimensions?.height || 0,
    };
  });

  return {
    media_type,
    user,
    caption: captionText ? { text: captionText } : null,
    image_versions2,
    video_versions,
    video_duration: raw.video_duration || 0,
    carousel_media: media_type === 8 ? carousel_media : undefined,
    original_width: raw.dimensions?.width || 0,
    original_height: raw.dimensions?.height || 0,
  };
}

function parseInstagramMediaInfo(rawItem, sourceUrl) {
  const item = normalizeInstagramItem(rawItem);

  const title = sanitizeFilename(
    item.caption?.text?.split("\n")[0] || `Instagram post by ${item.user?.username || "user"}`,
    "Instagram Post"
  );
  const uploader = item.user?.full_name || item.user?.username || null;
  const description = item.caption?.text || null;
  const thumbnail = item.image_versions2?.candidates?.[0]?.url || null;

  const formats = [];
  
  if (item.media_type === 8) { // Carousel
    item.carousel_media?.forEach((m, idx) => {
      const isVideo = m.media_type === 2;
      const slideNum = idx + 1;
      if (isVideo) {
        const firstVideo = m.video_versions?.[0];
        const videoUrl = firstVideo?.url;
        if (videoUrl) {
          const { width, height } = getInstagramDimensions(m, firstVideo, true);
          const minDim = width && height ? Math.min(width, height) : 1080;
          const qualitySuffix = ` - ${minDim}p`;
          formats.push({
            id: `photo:carousel_${idx}_video:direct`,
            selector: videoUrl,
            thumbnail: m.image_versions2?.candidates?.[0]?.url,
            mode: "direct",
            type: "video",
            ext: "mp4",
            container: "VIDEO",
            label: `Slide ${slideNum} (Video${qualitySuffix})`,
            note: "High quality video slide",
            qualityValue: 1000 - idx,
            sizeBytes: 0,
            sizeLabel: "Unknown",
            requiresServerSupport: false
          });
        }
      } else {
        const firstImage = m.image_versions2?.candidates?.[0];
        const imageUrl = firstImage?.url;
        if (imageUrl) {
          const { width, height } = getInstagramDimensions(m, firstImage, true);
          const minDim = width && height ? Math.min(width, height) : 1080;
          const qualitySuffix = ` - ${minDim}p`;
          formats.push({
            id: `photo:carousel_${idx}_image:direct`,
            selector: imageUrl,
            thumbnail: imageUrl,
            mode: "direct",
            type: "image",
            ext: "jpg",
            container: "IMAGE",
            label: `Slide ${slideNum} (Image${qualitySuffix})`,
            note: "High quality image slide",
            qualityValue: 1000 - idx,
            sizeBytes: 0,
            sizeLabel: "Unknown",
            requiresServerSupport: false
          });
        }
      }
    });
  } else if (item.media_type === 2) {
    const seenDimensions = new Set();
    const sortedVideos = [...(item.video_versions || [])].sort((a, b) => {
      const dimA = Math.min(a.width || 0, a.height || 0);
      const dimB = Math.min(b.width || 0, b.height || 0);
      return dimB - dimA;
    });

    sortedVideos.forEach((video, idx) => {
      const videoUrl = video.url;
      if (!videoUrl) return;

      const { width, height } = getInstagramDimensions(item, video, idx === 0);
      const minDim = width && height ? Math.min(width, height) : 1080;

      if (seenDimensions.has(minDim)) return;
      seenDimensions.add(minDim);

      const suffix = getResolutionSuffix(minDim);
      const isRecommended = idx === 0;
      const label = isRecommended ? `${minDim}p${suffix} (Recommended)` : `${minDim}p${suffix}`;
      const note = `${minDim}p • Ready with audio`;

      formats.push({
        id: `instagram:video:${minDim}:direct`,
        selector: videoUrl,
        thumbnail: null, // Set to null so we display standard video play icon like YouTube
        mode: "direct",
        type: "video",
        ext: "mp4",
        container: "MP4",
        label: label,
        note: note,
        qualityValue: minDim,
        sizeBytes: 0,
        sizeLabel: "Unknown",
        requiresServerSupport: false
      });
    });

    // Add MP3 audio extraction format option
    const durationSeconds = item.video_duration || 0;
    const audioBitrate = 128; // kbps
    const mp3SizeBytes = durationSeconds > 0
      ? Math.round((audioBitrate * 1000 / 8) * durationSeconds)
      : 0;

    formats.push({
      id: "instagram:audio:mp3",
      selector: "bestaudio/best",
      mode: "extract-audio",
      type: "audio",
      isAdaptive: false,
      ext: "mp3",
      container: "MP3",
      label: "Best available",
      note: "Converted to MP3 on the server",
      qualityValue: 999,
      sizeBytes: mp3SizeBytes,
      sizeLabel: mp3SizeBytes > 0 ? `~${formatBytes(mp3SizeBytes)}` : "Unknown",
      requiresServerSupport: true
    });
  } else {
    const firstImage = item.image_versions2?.candidates?.[0];
    const imageUrl = firstImage?.url;
    if (imageUrl) {
      const { width, height } = getInstagramDimensions(item, firstImage, true);
      const minDim = width && height ? Math.min(width, height) : 1080;
      const suffix = getResolutionSuffix(minDim);
      const label = `${minDim}p Image${suffix}`;
      
      formats.push({
        id: `instagram:image:direct`,
        selector: imageUrl,
        thumbnail: imageUrl,
        mode: "direct",
        type: "image",
        ext: "jpg",
        container: "IMAGE",
        label: label,
        note: "High quality image",
        qualityValue: minDim,
        sizeBytes: 0,
        sizeLabel: "Unknown",
        requiresServerSupport: false
      });
    }
  }

  const videoGroupsMap = new Map();
  formats.forEach(format => {
    if (format.type !== "video" && format.type !== "image") return;
    const container = format.container;
    if (!videoGroupsMap.has(container)) {
      videoGroupsMap.set(container, {
        container,
        type: "video",
        items: []
      });
    }
    videoGroupsMap.get(container).items.push(format);
  });

  const videoGroups = Array.from(videoGroupsMap.values());

  const audioGroupsMap = new Map();
  formats.forEach(format => {
    if (format.type !== "audio") return;
    const container = format.container;
    if (!audioGroupsMap.has(container)) {
      audioGroupsMap.set(container, {
        container,
        type: "audio",
        items: []
      });
    }
    audioGroupsMap.get(container).items.push(format);
  });

  const audioGroups = Array.from(audioGroupsMap.values());

  const durationSeconds = item.video_duration || 0;
  const durationLabel = durationSeconds > 0 ? formatDurationSeconds(durationSeconds) : "Unknown";

  return {
    sourceUrl,
    title,
    description: description ? description.slice(0, 180) : null,
    thumbnail,
    sourceName: "Instagram",
    durationLabel,
    durationSeconds,
    uploader,
    uploadDate: null,
    formats,
    formatGroups: {
      video: videoGroups,
      audio: audioGroups
    },
    serverWarning: ""
  };
}

export async function inspectMedia(sourceUrl) {
  const cached = getCachedInspectResult(sourceUrl);
  if (cached) {
    console.log("inspectMedia: Serving cached result, skipping YouTube/source request entirely.");
    return cached;
  }

  let stdout, stderr;
  const isYouTube = sourceUrl && (sourceUrl.includes("youtube.com") || sourceUrl.includes("youtu.be"));
  const isInstagram = sourceUrl && (sourceUrl.includes("instagram.com") || sourceUrl.includes("instagr.am"));

  if (isInstagram) {
    console.log("inspectMedia: Instagram link detected. Trying fast Instagram API fetch first...");
    try {
      const shortcodeMatch = sourceUrl.match(/(?:p|reel|tv)\/([A-Za-z0-9-_]+)/);
      if (shortcodeMatch) {
        const shortcode = shortcodeMatch[1];
        const item = await fetchInstagramMediaInfo(shortcode);
        const parsed = parseInstagramMediaInfo(item, sourceUrl);
        if (parsed && parsed.formats && parsed.formats.length > 0) {
          // Resolve missing sizes via parallel HEAD requests
          const missingSize = parsed.formats.filter(f => f.selector && (!f.sizeBytes || f.sizeBytes === 0));
          if (missingSize.length > 0) {
            await Promise.allSettled(
              missingSize.map(async (f) => {
                try {
                  const res = await fetch(f.selector, {
                    method: "HEAD",
                    signal: AbortSignal.timeout(3000),
                    headers: {
                      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                    }
                  });
                  const len = parseInt(res.headers.get("content-length") || "0", 10);
                  if (len > 0) {
                    f.sizeBytes = len;
                    f.sizeLabel = formatBytes(len);
                  }
                } catch {
                  // Ignore
                }
              })
            );
          }
          console.log("inspectMedia: Fast Instagram API fetch succeeded!");
          setCachedInspectResult(sourceUrl, parsed);
          return parsed;
        }
      }
    } catch (fallbackError) {
      console.warn("inspectMedia: Fast Instagram API fetch failed, falling back to standard yt-dlp:", fallbackError.message);
    }
  }

  // Keep this to at most 2 attempts. Every extra attempt is another request to YouTube from
  // the same server IP, and stacking 4 of them per single user paste is what gets the whole
  // server IP rate-limited — not the user's actual request volume.
  let attempts = [];
  if (isYouTube) {
    // Probe the POT provider once so getPrimaryYouTubeClient() picks the right client below.
    await ensurePotProbed();
    const hasCookies = await hasCookiesConfigured();
    if (hasCookies) {
      attempts.push({ useCookies: true, usePlayerClient: false, name: "Cookies, Default" });
      attempts.push({ useCookies: true, usePlayerClient: true, name: "Cookies, Safe Fallback" });
    } else {
      attempts.push({ useCookies: false, usePlayerClient: false, name: "Anonymous, Default" });
      attempts.push({ useCookies: false, usePlayerClient: true, name: "Anonymous, Safe Fallback" });
    }
  } else {
    // Non-YouTube URLs run with default cookies, no player-client
    attempts.push({ useCookies: false, usePlayerClient: false, name: "Default" });
  }

  let lastError = null;

  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];

    // Skip forcing cookies attempt if we don't have cookies available.
    const cookiesArg = await getCookiesArg(sourceUrl, attempt.useCookies);
    if (attempt.useCookies && cookiesArg.length === 0) {
      console.log(`inspectMedia: Skipping attempt '${attempt.name}' because no cookies are configured.`);
      continue;
    }

    // Confirmed via diagnostic logging that failures here were our own exec timeout (SIGTERM,
    // empty stdout/stderr) killing yt-dlp before it finished — not YouTube rejecting the request.
    // The PO-token round trip plus cookie auth plus HF's network legitimately takes longer than
    // the previous 10-14s budget. Give it real room instead of misreporting this as rate-limiting.
    // Deno JS-challenge solving plus the PO-token round trip legitimately takes 20-40s on HF.
    // The old 30s budget was killing requests mid-"Downloading player". Give it real room.
    const socketTimeout = "20";
    const execTimeout = 60000;

    console.log(`inspectMedia: Trying attempt '${attempt.name}' (Cookies: ${cookiesArg.length > 0 ? "Yes" : "No"}, Player Client: ${attempt.usePlayerClient}, Timeout: ${execTimeout}ms)`);

    // TEMP DIAGNOSTIC: --verbose + live stderr streaming so we can see WHERE yt-dlp hangs
    // on Hugging Face. Previous runs were killed with empty stderr because execFileAsync
    // buffered everything and lost it on SIGTERM. We stream it live instead.
    // --extractor-retries rides out the intermittent curl_cffi "TLS connect error: invalid
    // library" that otherwise fails signature solving and strips formats.
    const args = ["--ignore-config", "--geo-bypass", "--verbose", "--extractor-retries", "3", "--js-runtimes", "deno", "--socket-timeout", socketTimeout, ...getImpersonateArg(), ...getProxyArg(), ...getPotProviderArg()];
    // Primary attempt uses the POT-aware client (tv,web with a PO token on prod; tv_embedded
    // locally where there's no POT) — both expose the full adaptive ladder up to 4K. The Safe
    // Fallback widens to android/mweb for videos the primary set misses.
    if (attempt.usePlayerClient) {
      args.push("--extractor-args", `youtube:player-client=${getFallbackYouTubeClient()}`);
    } else {
      args.push("--extractor-args", `youtube:player-client=${getPrimaryYouTubeClient()}`);
    }
    args.push(...cookiesArg, "--dump-single-json", "--no-playlist", "--skip-download", sourceUrl);

    // curl_cffi's BoringSSL intermittently throws "curl: (35) ... invalid library" on a
    // sub-request (player JS / client config). It's non-deterministic — the same command
    // succeeds on a retry — and when it hits the player-JS download it cascades into a fake
    // LOGIN_REQUIRED / "Sign in to confirm you're not a bot". yt-dlp's own retries don't
    // cover these, so we re-run the whole command up to 3x when we see that signature.
    let attemptError = null;
    let succeeded = false;
    for (let curlTry = 0; curlTry < 3; curlTry++) {
      try {
        const result = await runYtdlpStreamed(args, execTimeout, attempt.name);
        stdout = result.stdout;
        stderr = result.stderr;
        succeeded = true;
        break;
      } catch (error) {
        attemptError = error;
        if (error.code === "ENOENT") {
          throw createYtError("yt-dlp is not installed on this server yet. Install yt-dlp and ffmpeg first.", 503);
        }
        const isTransientCurl = /curl:\s*\(35\)|invalid library/i.test(error.stderr || "");
        if (isTransientCurl && curlTry < 2) {
          console.warn(`inspectMedia: Attempt '${attempt.name}' hit transient curl_cffi TLS error, retrying (${curlTry + 1}/2)...`);
          continue;
        }
        break;
      }
    }

    if (succeeded) {
      // Accept the first successful result outright — don't burn another request on a
      // quality gamble. The download step still tries a player-client fallback if needed.
      break;
    } else {
      console.error(
        `inspectMedia: Attempt '${attempt.name}' failed: killed=${attemptError?.killed} signal=${attemptError?.signal} code=${attemptError?.code} stderr=${JSON.stringify(attemptError?.stderr?.trim()?.slice(-1500))}`
      );
      lastError = attemptError;

      // If it's the last attempt, let it exit loop and throw
      if (i === attempts.length - 1) {
        break;
      }
    }
  }

  if (!stdout) {
    const isInstagram = sourceUrl && (sourceUrl.includes("instagram.com") || sourceUrl.includes("instagr.am"));
    if (isInstagram) {
      console.log("inspectMedia: yt-dlp failed on Instagram link. Attempting Instagram API fallback...");
      try {
        const shortcodeMatch = sourceUrl.match(/(?:p|reel|tv)\/([A-Za-z0-9-_]+)/);
        if (shortcodeMatch) {
          const shortcode = shortcodeMatch[1];
          const item = await fetchInstagramMediaInfo(shortcode);
          const parsed = parseInstagramMediaInfo(item, sourceUrl);
          setCachedInspectResult(sourceUrl, parsed);
          return parsed;
        }
      } catch (fallbackError) {
        console.error("inspectMedia: Instagram API fallback failed:", fallbackError.stack || fallbackError.message, fallbackError.cause);
      }
    }

    const errText = lastError?.stderr?.trim() || lastError?.message || "This link could not be inspected right now.";
    if (isYouTube) {
      throw createYtError(
        "YouTube couldn't be reached right now (it may be temporarily rate-limiting this server). Please wait a minute and try pasting your link again.",
        403
      );
    }
    if (errText.includes("No video formats found") && (sourceUrl.includes("instagram.com") || sourceUrl.includes("instagr.am"))) {
      throw createYtError(
        "This Instagram link contains only photos/images. Downloader by The Atom only supports downloading videos (like Reels and video posts) or audio.",
        400
      );
    }
    throw createYtError(errText, 400);
  }

  try {
    const info = JSON.parse(stdout);

    // For formats that have a direct URL but no filesize or bitrate info (common with
    // Instagram progressive streams), make parallel HEAD requests to get Content-Length.
    // Runs in parallel with a 3-second timeout per request so it adds minimal latency.
    const rawFormats = info.formats || [];
    const missingSize = rawFormats.filter(
      (f) => f.url && !f.filesize && !f.filesize_approx && !(f.tbr || f.vbr || f.abr)
    );

    if (missingSize.length > 0) {
      await Promise.allSettled(
        missingSize.map(async (f) => {
          try {
            const res = await fetch(f.url, {
              method: "HEAD",
              signal: AbortSignal.timeout(3000),
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
              }
            });
            const len = parseInt(res.headers.get("content-length") || "0", 10);
            if (len > 0) {
              f.filesize = len; // Mutate in place — picked up by estimateSizeBytes
            }
          } catch {
            // Silently ignore — size stays "Unknown" if HEAD fails
          }
        })
      );
    }

    const baseFormats = normalizeFormats(info);
    const serverWarning = normalizeWarningText(stderr);
    const formats = applyServerAvailability(baseFormats, {
      serverWarning,
      sourceUrl,
      sourceName: info.extractor_key || info.extractor || info.webpage_url_domain || ""
    });
    const title = sanitizeFilename(info.title || "Untitled media", "Untitled media");

    const mediaResult = {
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

    setCachedInspectResult(sourceUrl, mediaResult);
    return mediaResult;
  } catch (error) {
    if (error.statusCode) throw error;
    throw createYtError(error.message || "This link could not be inspected right now.", 400);
  }
}

function buildDownloadArgs({ sourceUrl, selector, mode, ext, outputTemplate, recode = false, usePlayerClient = true }) {
  const args = ["--ignore-config", "--geo-bypass", "--js-runtimes", "deno", "--no-warnings", "--no-playlist", ...getImpersonateArg(), ...getProxyArg(), ...getPotProviderArg()];
  // Match the client set used in inspectMedia so the selected format IDs resolve at download
  // time. Primary uses the POT-aware client (tv,web on prod, tv_embedded locally); the Safe
  // Fallback widens to android/mweb.
  if (usePlayerClient) {
    args.push("--extractor-args", `youtube:player-client=${getFallbackYouTubeClient()}`);
  } else {
    args.push("--extractor-args", `youtube:player-client=${getPrimaryYouTubeClient()}`);
  }

  // Optimize download performance by writing directly to final file & skipping unnecessary disk/metadata tasks
  args.push("--no-part", "--no-mtime", "--no-embed-metadata", "--no-embed-thumbnail");

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

    if (recode) {
      // VP9/AV1 codecs don't play on macOS QuickTime or iOS natively.
      // Re-encode to H.264 using a fast preset so the file works everywhere.
      // -c:a copy preserves audio quality without re-encoding.
      args.push(
        "--postprocessor-args",
        "Merger+ffmpeg:-c:v libx264 -crf 23 -preset veryfast -c:a copy"
      );
    }
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

export async function streamDownloadDirect({ sourceUrl, selector, ext }) {
  const isDirectUrl = selector && (selector.startsWith("http://") || selector.startsWith("https://"));
  
  if (isDirectUrl) {
    const res = await fetch(selector, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch direct stream: status ${res.status}`);
    }
    return res.body;
  }

  const hasCookies = await hasCookiesConfigured();
  const cookiesArg = await getCookiesArg(sourceUrl, hasCookies);
  const args = ["--ignore-config", "--geo-bypass", "--js-runtimes", "deno", "--no-warnings", "--no-playlist", ...getImpersonateArg(), ...getProxyArg(), ...getPotProviderArg()];

  const isYouTube = sourceUrl && (sourceUrl.includes("youtube.com") || sourceUrl.includes("youtu.be"));
  if (isYouTube) {
    await ensurePotProbed();
    args.push("--extractor-args", `youtube:player-client=${getPrimaryYouTubeClient()}`);
  }

  args.push("-f", selector || "best", "-o", "-", sourceUrl);
  args.unshift(...cookiesArg);

  const child = spawn(YT_DLP_BIN, args, {
    stdio: ["ignore", "pipe", "pipe"]
  });

  const stderrChunks = [];
  child.stderr.on("data", (chunk) => {
    stderrChunks.push(chunk);
  });

  return new ReadableStream({
    start(controller) {
      child.stdout.on("data", (chunk) => {
        controller.enqueue(new Uint8Array(chunk));
      });

      child.stdout.on("end", () => {
        if (child.exitCode !== null && child.exitCode !== 0) {
          const stderr = Buffer.concat(stderrChunks).toString().trim();
          console.error(`yt-dlp stream exited with code ${child.exitCode}: ${stderr}`);
        }
        controller.close();
      });

      child.stdout.on("error", (error) => {
        controller.error(error);
        child.kill();
      });
    },
    cancel() {
      child.kill();
    }
  });
}

export async function prepareDownloadFile({ sourceUrl, selector, mode, ext, downloadId, recode = false }) {
  const isDirectUrl = selector && (selector.startsWith("http://") || selector.startsWith("https://"));
  // Ensure the POT probe has run so buildDownloadArgs (sync) reads the correct cached client.
  await ensurePotProbed();

  if (isDirectUrl) {
    const outputDir = await createTempOutputDir();
    const title = sourceUrl.includes("instagram.com") ? "Instagram_Post" : "download";
    const filename = `${title}.${ext}`;
    const filePath = path.join(outputDir, filename);

    if (downloadId) {
      activeDownloads.set(downloadId, { status: "downloading", progress: 0 });
    }

    try {
      const response = await fetch(selector, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch direct media: status ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      await writeFile(filePath, Buffer.from(arrayBuffer));

      const cleanup = async () => {
        await rm(outputDir, { recursive: true, force: true }).catch(() => null);
      };

      if (downloadId) {
        activeDownloads.set(downloadId, {
          status: "completed",
          progress: 100,
          filePath,
          cleanup
        });

        // Auto-cleanup after 5 minutes if client never fetches it
        setTimeout(async () => {
          const entry = activeDownloads.get(downloadId);
          if (entry && entry.filePath === filePath) {
            try {
              await cleanup();
            } catch (e) {
              console.error("Auto-cleanup failed:", e);
            }
            activeDownloads.delete(downloadId);
          }
        }, 5 * 60 * 1000);
      }

      return {
        filePath,
        cleanup
      };
    } catch (err) {
      if (downloadId) {
        activeDownloads.set(downloadId, { status: "failed", error: err.message || "Failed" });
      }
      await rm(outputDir, { recursive: true, force: true }).catch(() => null);
      throw err;
    }
  }

  const outputDir = await createTempOutputDir();
  const outputTemplate = path.join(outputDir, "%(title)s.%(ext)s");

  const runDownload = async (useCookiesForce, usePlayerClient = true) => {
    const args = buildDownloadArgs({
      sourceUrl,
      selector,
      mode,
      ext,
      outputTemplate,
      recode,
      usePlayerClient
    });

    const cookiesArg = await getCookiesArg(sourceUrl, useCookiesForce);
    args.unshift(...cookiesArg);

    if (downloadId) {
      activeDownloads.set(downloadId, { status: "downloading", progress: 0 });
    }

    const child = spawn(YT_DLP_BIN, args, {
      stdio: ["ignore", "pipe", "pipe"]
    });

    let downloadCount = 0;
    const seenFiles = new Set();

    child.stdout.on("data", (chunk) => {
      // yt-dlp writes progress with \r between updates — split on both \r and \n
      const text = chunk.toString();
      const lines = text.split(/[\r\n]+/);
      for (const line of lines) {
        if (line.includes("[Merger]") || line.includes("Merging formats") || line.includes("[ExtractAudio]") || line.includes("ffmpeg")) {
          if (downloadId) {
            activeDownloads.set(downloadId, { status: "merging", progress: 99 });
          }
        }

        const destMatch = line.match(/\[download\]\s+Destination:\s+(.+)$/) || line.match(/\[download\]\s+(.+?)\s+has already been downloaded/);
        if (destMatch) {
          const filePath = destMatch[1].trim();
          if (!seenFiles.has(filePath)) {
            seenFiles.add(filePath);
            downloadCount = seenFiles.size;
          }
        }

        const match = line.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
        if (match && downloadId) {
          const percent = parseFloat(match[1]);
          const current = activeDownloads.get(downloadId);

          let lastPercent = current?.lastPercent || 0;
          let currentDownloadNum = current?.downloadNum || 1;

          // Heuristic to detect second stream download (e.g. video finished at >80% and audio restarts at <20%)
          if (percent < 20 && lastPercent > 80) {
            currentDownloadNum = 2;
          }

          let progress = percent;
          if (mode === "merge") {
            // In merge mode, there are 2 downloads: video (first) and audio (second).
            // We map the first download (video) to 0% - 85%
            // and the second download (audio) to 85% - 98%.
            if (downloadCount > 1 || currentDownloadNum > 1) {
              progress = 85 + (percent * 0.13);
              currentDownloadNum = 2; // ensure persist
            } else {
              progress = percent * 0.85;
            }
          } else {
            // Cap direct downloading progress at 95% to avoid displaying 100%
            // before the process has exited and the file is actually ready.
            progress = percent * 0.95;
          }

          // Strict caps during downloading phase to prevent showing 100% prematurely
          const maxDownloadingProgress = mode === "merge" ? 98 : 95;
          if (progress > maxDownloadingProgress) {
            progress = maxDownloadingProgress;
          }

          // Only update if progress is moving forward or status changed/reset
          if (!current || current.progress < progress || current.status !== "downloading") {
            activeDownloads.set(downloadId, {
              status: "downloading",
              progress,
              lastPercent: percent,
              downloadNum: currentDownloadNum
            });
          }
        }
      }
    });

    const stderrChunks = [];
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderrChunks.push(Buffer.from(chunk));

      if (downloadId && (text.includes("[Merger]") || text.includes("Merging formats") || text.includes("ffmpeg"))) {
        activeDownloads.set(downloadId, { status: "merging", progress: 99 });
      }
    });

    const exitCode = await new Promise((resolve, reject) => {
      child.once("error", (error) => {
        if (downloadId) {
          activeDownloads.set(downloadId, { status: "failed", error: error.message || "Failed" });
        }
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
      throw createYtError(stderr, exitCode);
    }
  };

  const isYouTube = sourceUrl && (sourceUrl.includes("youtube.com") || sourceUrl.includes("youtu.be"));
  const hasCookies = isYouTube && (await hasCookiesConfigured());

  let downloadSucceeded = false;
  let lastDownloadError = null;

  if (hasCookies) {
    console.log("prepareDownloadFile: Cookies configured, prioritizing forced cookies HQ download...");
    try {
      await runDownload(true, false);
      downloadSucceeded = true;
    } catch (error) {
      console.error("prepareDownloadFile: Prioritized forced cookies HQ attempt failed. Trying safe fallback with cookies...", error.message);
      lastDownloadError = error;
      try {
        await runDownload(true, true);
        downloadSucceeded = true;
      } catch (cookieFallbackError) {
        console.error("prepareDownloadFile: Forced cookies safe fallback attempt failed. Retrying anonymously...", cookieFallbackError.message);
        lastDownloadError = cookieFallbackError;
        try {
          await runDownload(false, false);
          downloadSucceeded = true;
        } catch (retryError) {
          lastDownloadError = retryError;
        }
      }
    }
  } else {
    try {
      await runDownload(false, false);
      downloadSucceeded = true;
    } catch (error) {
      lastDownloadError = error;
      if (isYouTube) {
        console.log("prepareDownloadFile: Anonymous HQ download failed. Checking forced cookies HQ...");
        const cookiesArgForced = await getCookiesArg(sourceUrl, true);
        if (cookiesArgForced.length > 0) {
          try {
            await runDownload(true, false);
            downloadSucceeded = true;
          } catch (retryError) {
            console.error("prepareDownloadFile: Forced cookies HQ attempt failed. Trying safe fallback with cookies...", retryError.message);
            lastDownloadError = retryError;
            try {
              await runDownload(true, true);
              downloadSucceeded = true;
            } catch (cookieFallbackError) {
              console.error("prepareDownloadFile: Forced cookies safe fallback attempt failed:", cookieFallbackError.message);
              lastDownloadError = cookieFallbackError;
            }
          }
        }
      }
    }
  }

  if (isYouTube && !downloadSucceeded) {
    console.log("prepareDownloadFile: HQ attempts failed/skipped. Trying Safe Fallback with player-client...");
    try {
      await runDownload(false, true);
      downloadSucceeded = true;
    } catch (fallbackError) {
      console.error("prepareDownloadFile: Safe Fallback attempt failed:", fallbackError.message);
      lastDownloadError = fallbackError;
    }
  }

  if (!downloadSucceeded) {
    if (downloadId) {
      activeDownloads.set(downloadId, { status: "failed", error: "Process exited with non-zero code" });
    }
    await rm(outputDir, { recursive: true, force: true }).catch(() => null);
    throw buildDownloadError(lastDownloadError?.message || "The download could not be completed.");
  }

  const filePath = await locateCompletedFile(outputDir);
  const cleanup = async () => {
    await rm(outputDir, { recursive: true, force: true }).catch(() => null);
  };

  if (downloadId) {
    activeDownloads.set(downloadId, {
      status: "completed",
      progress: 100,
      filePath,
      cleanup
    });

    // Auto-cleanup after 5 minutes if client never fetches it
    setTimeout(async () => {
      const entry = activeDownloads.get(downloadId);
      if (entry && entry.filePath === filePath) {
        try {
          await cleanup();
        } catch (e) {
          console.error("Auto-cleanup failed:", e);
        }
        activeDownloads.delete(downloadId);
      }
    }, 5 * 60 * 1000);
  }

  return {
    filePath,
    cleanup
  };
}

export function getDownloadHeaders({ filename, ext, size }) {
  const safeName = sanitizeFilename(filename, "download");
  const finalExt = normalizeExt(ext, "mp4");

  const headers = {
    "Cache-Control": "no-store",
    "Content-Type": guessMimeType(finalExt),
    "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`${safeName}.${finalExt}`)}`
  };

  if (size && size > 0) {
    headers["Content-Length"] = String(size);
  }

  return headers;
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
          await onFinish(true);
        }
      });

      nodeStream.on("error", async (error) => {
        controller.error(error);
        if (onFinish) {
          await onFinish(false);
        }
      });
    },
    async cancel() {
      nodeStream.destroy();
      if (onFinish) {
        await onFinish(false);
      }
    }
  });
}


