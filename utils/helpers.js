export function isValidSourceUrl(value) {
  if (!value || typeof value !== "string") {
    return false;
  }

  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

export function normalizeSourceUrl(value) {
  let urlStr = value.trim();
  try {
    const url = new URL(urlStr);
    if (url.hostname === "x.com" || url.hostname === "www.x.com") {
      url.hostname = "twitter.com";
      return url.toString();
    }
  } catch {}
  return urlStr;
}

export function formatBytes(value) {
  if (!value || !Number.isFinite(value) || value <= 0) {
    return "Unknown";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let index = 0;

  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }

  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

export function formatDurationSeconds(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return "Unknown";
  }

  const totalSeconds = Math.round(value);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

export function formatCount(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatSourceName(value = "") {
  const normalized = value.toLowerCase();

  if (normalized.includes("youtube")) {
    return "YouTube";
  }

  if (normalized.includes("instagram")) {
    return "Instagram";
  }

  if (normalized.includes("tiktok")) {
    return "TikTok";
  }

  if (normalized === "x" || normalized.includes("twitter")) {
    return "X / Twitter";
  }

  if (normalized.includes("facebook")) {
    return "Facebook";
  }

  return value || "Direct media";
}

export function sanitizeFilename(value, fallback = "download") {
  const trimmed = (value || "").trim();
  const safe = trimmed
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return safe || fallback;
}
