"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Clipboard, Copy, Link2, LoaderCircle, X } from "lucide-react";
import { useGlassEffect, GlassButton, LiquidGlassFilter } from "@zakisheriff/liquid-glass";
import EmptyState from "@/components/EmptyState";
import FormatCard from "@/components/FormatCard";
import GlassCard from "@/components/GlassCard";
import LoadingArcade from "@/components/LoadingArcade";
import { useToast } from "@/components/providers/ToastProvider";
import { isValidSourceUrl } from "@/utils/helpers";
import styles from "@/components/LinkInspector.module.css";

async function getJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || "Request failed.");
    error.status = response.status;
    throw error;
  }

  return data;
}

function CustomGlassInputCard({ children, className, style: externalStyle, ...props }) {
  const { style: glassStyle } = useGlassEffect({
    intensity: 6,
    shimmer: true,
    thickness: 1
  });

  return (
    <div
      data-liquid-glass
      style={{ ...glassStyle, ...externalStyle }}
      className={`${className} lg-root lg-card`}
      {...props}
    >
      <div className="lg-backdrop-surface" aria-hidden="true" />
      <div className="lg-shadow" aria-hidden="true" />
      <div className="lg-surface">
        <div className={`${styles.inputCardContent} lg-content`}>
          {children}
        </div>
      </div>
    </div>
  );
}

const PLATFORMS = {
  YouTube: {
    icon: (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="#FF0000" style={{ display: "block" }}>
        <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.508 9.388.508 9.388.508s7.518 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
    bg: "rgba(255, 0, 0, 0.05)",
    border: "rgba(255, 0, 0, 0.12)",
    color: "#d92121"
  },
  Instagram: {
    icon: (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#E1306C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
      </svg>
    ),
    bg: "rgba(225, 48, 108, 0.05)",
    border: "rgba(225, 48, 108, 0.12)",
    color: "#c13584"
  },
  TikTok: {
    icon: (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style={{ display: "block" }}>
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.05 1.62 4.2 1.21 1.4 3 2.27 4.9 2.5v3.26c-1.89-.04-3.73-.58-5.32-1.63-.12 2.93-.04 5.88-.07 8.81-.1 2.13-.8 4.29-2.28 5.82-1.74 1.9-4.35 2.76-6.88 2.37-2.43-.33-4.66-1.8-5.89-3.96-1.35-2.27-1.48-5.22-.38-7.61C3.4 11.1 5.6 9.3 8.2 8.79v3.28c-1.31.25-2.52 1.05-3.17 2.22-.72 1.25-.76 2.87-.12 4.14.6 1.27 1.94 2.18 3.35 2.3 1.5.15 3.03-.43 3.86-1.68.74-1.07.78-2.48.77-3.74-.01-5.18-.01-10.36-.01-15.54.01-.1-.01-.2 0-.3z"/>
      </svg>
    ),
    bg: "rgba(0, 0, 0, 0.05)",
    border: "rgba(0, 0, 0, 0.12)",
    color: "#111111"
  },
  "X / Twitter": {
    icon: (
      <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" style={{ display: "block" }}>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    bg: "rgba(15, 20, 25, 0.05)",
    border: "rgba(15, 20, 25, 0.12)",
    color: "#0f1419"
  },
  Facebook: {
    icon: (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="#1877F2" style={{ display: "block" }}>
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    bg: "rgba(24, 119, 242, 0.05)",
    border: "rgba(24, 119, 242, 0.12)",
    color: "#1877f2"
  }
};

const fallbackPlatform = {
  icon: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  bg: "rgba(12, 12, 12, 0.04)",
  border: "rgba(12, 12, 12, 0.1)",
  color: "var(--muted)"
};

export default function LinkInspector() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [input, setInput] = useState(searchParams.get("url") || "");
  const [loading, setLoading] = useState(false);
  const [media, setMedia] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [selectedFormatIds, setSelectedFormatIds] = useState(new Set());
  const [isLocalhost, setIsLocalhost] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      const local = hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "[::1]" ||
        hostname.startsWith("192.168.");
      setIsLocalhost(local);
    }
  }, []);

  const copyTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  const handleContainerClick = (e) => {
    if (e.target.tagName !== "BUTTON" && !e.target.closest("button")) {
      inputRef.current?.focus();
    }
  };

  // Resolve API base once at component level — used for inspect, download, status, and thumbnail proxy
  const apiBase = process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== "undefined" &&
     (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "[::1]" ||
      window.location.hostname.startsWith("192.168."))
     ? ""
     : "https://zakisheriff-downloader-backend.hf.space");

  const isInstagramCarousel = media?.formats?.some(f => f.id.startsWith("photo:"));
  const isImageOnly = media?.formats?.every(f => f.type === "image");

  const visibleVideoGroups = (media?.formatGroups?.video || [])
    .map((group) => ({
      ...group,
      items: group.items.filter((format) => !format.disabled)
    }))
    .filter((group) => group.items.length > 0);

  const visibleAudioGroups = (media?.formatGroups?.audio || [])
    .map((group) => ({
      ...group,
      items: group.items.filter((format) => !format.disabled)
    }))
    .filter((group) => group.items.length > 0);

  const visibleFormatsCount = [
    ...visibleVideoGroups.flatMap((group) => group.items),
    ...visibleAudioGroups.flatMap((group) => group.items)
  ].length;

  const inspectLink = async (sourceUrl) => {
    setLoading(true);
    setError("");
    setSelectedFormatIds(new Set()); // Reset selection

    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
      if (window.lenis) {
        window.lenis.scrollTo(0, { immediate: true });
      }
    }

    try {
      const data = await getJson(`${apiBase}/api/media/inspect?url=${encodeURIComponent(sourceUrl)}`);
      setMedia(data.media);
    } catch (requestError) {
      setMedia(null);
      setError(requestError.message || "This link could not be inspected.");
      showToast({
        title: requestError.status === 503 ? "Server setup needed" : "Could not inspect link",
        description: requestError.message || "This link could not be inspected.",
        variant: "warning"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (!media?.formats) return;
    const allIds = media.formats.filter(f => f.id.startsWith("photo:")).map(f => f.id);
    setSelectedFormatIds(new Set(allIds));
  };

  const handleDeselectAll = () => {
    setSelectedFormatIds(new Set());
  };

  const handleDownloadSelected = () => {
    if (!media?.formats) return;
    const selectedFormats = media.formats.filter(f => selectedFormatIds.has(f.id));

    selectedFormats.forEach((format, idx) => {
      setTimeout(async () => {
        // Fast path: direct CDN download for images (bypasses slow server proxy)
        const isDirectCdnImage = format.mode === "direct" &&
          format.selector?.startsWith("https://") &&
          (format.ext === "jpg" || format.ext === "jpeg" || format.ext === "png" || format.ext === "webp");

        if (isDirectCdnImage) {
          try {
            const res = await fetch(format.selector);
            if (!res.ok) throw new Error(`CDN fetch failed: ${res.status}`);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${media.title || "download"}_${format.label || "image"}.${format.ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            return;
          } catch (directErr) {
            console.warn("Direct CDN download failed for bulk item, falling back to server proxy:", directErr.message);
          }
        }

        // Fallback: server proxy via iframe
        const downloadParams = new URLSearchParams({
          url: media.sourceUrl,
          format: format.selector,
          mode: format.mode,
          ext: format.ext,
          formatId: format.id
        });
        const downloadUrl = `${apiBase}/api/media/download?${downloadParams.toString()}`;
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = downloadUrl;
        document.body.appendChild(iframe);
        setTimeout(() => document.body.removeChild(iframe), 5000);
      }, idx * 300);
    });

    showToast({
      title: "Downloading selected",
      description: `Starting download of ${selectedFormats.length} item(s)...`,
      variant: "success"
    });
  };

  useEffect(() => {
    const currentUrl = searchParams.get("url") || "";
    setInput(currentUrl);
    setSelectedFormatIds(new Set()); // Reset selection

    if (currentUrl && isValidSourceUrl(currentUrl)) {
      inspectLink(currentUrl);
    } else {
      setMedia(null);
      setError("");
      setLoading(false);
    }
  }, [searchParams]);

  const handleInspect = async () => {
    if (!input.trim()) {
      showToast({
        title: "Link required",
        description: "Paste a public video or post URL first.",
        variant: "warning"
      });
      return;
    }

    if (!isValidSourceUrl(input)) {
      showToast({
        title: "Invalid link",
        description: "Paste a valid http or https URL before continuing.",
        variant: "warning"
      });
      return;
    }

    const nextUrl = `/dashboard?url=${encodeURIComponent(input.trim())}`;
    router.replace(nextUrl);
    inspectLink(input.trim());
  };

  const handleCopy = async () => {
    if (!input.trim()) return;
    try {
      await navigator.clipboard.writeText(input.trim());
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const trimmedText = (text || "").trim();
      if (trimmedText) {
        setInput(trimmedText);
        const nextUrl = `/dashboard?url=${encodeURIComponent(trimmedText)}`;
        router.replace(nextUrl);
        inspectLink(trimmedText);
      }
    } catch (err) {
      console.error("Failed to read clipboard contents: ", err);
    }
  };

  const handleClear = () => {
    setInput("");
    setMedia(null);
    setError("");
    setSelectedFormatIds(new Set()); // Reset selection
    router.replace("/dashboard");
  };

  return (
    <LiquidGlassFilter>
      <div className={styles.page}>
      <GlassCard className={styles.hero}>
        <p className={styles.inputHeading}>{isLocalhost ? "Paste the link." : "Run Downloader Locally."}</p>
        {isLocalhost ? (
          <CustomGlassInputCard className={styles.inputCard} onClick={handleContainerClick}>
            <div className={styles.inputWrap}>
              <Link2 size={18} />
              <input
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInspect()}
                placeholder="Paste https://youtube.com/... or any supported public link"
              />
              {input ? (
                <>
                  <GlassButton
                    className={styles.iconBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy();
                    }}
                    title={copied ? "Copied!" : "Copy link"}
                    aria-label="Copy link"
                    type="button"
                    variant="ghost"
                    intensity={4}
                    size="sm"
                    style={{ minWidth: "30px", width: "30px", height: "30px", borderRadius: "50%", padding: 0 }}
                  >
                    {copied ? <Check size={15} /> : <Copy size={15} />}
                  </GlassButton>
                  <GlassButton
                    className={styles.iconBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePaste();
                    }}
                    title="Paste new link"
                    aria-label="Paste new link from clipboard"
                    type="button"
                    variant="ghost"
                    intensity={4}
                    size="sm"
                    style={{ minWidth: "30px", width: "30px", height: "30px", borderRadius: "50%", padding: 0 }}
                  >
                    <Clipboard size={15} />
                  </GlassButton>
                  <GlassButton
                    className={styles.iconBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClear();
                    }}
                    title="Clear"
                    aria-label="Clear input"
                    type="button"
                    variant="ghost"
                    intensity={4}
                    size="sm"
                    style={{ minWidth: "30px", width: "30px", height: "30px", borderRadius: "50%", padding: 0 }}
                  >
                    <X size={15} />
                  </GlassButton>
                </>
              ) : (
                <GlassButton
                  className={styles.iconBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePaste();
                  }}
                  title="Paste from clipboard"
                  aria-label="Paste from clipboard"
                  type="button"
                  variant="ghost"
                  intensity={4}
                  size="sm"
                  style={{ minWidth: "30px", width: "30px", height: "30px", borderRadius: "50%", padding: 0 }}
                >
                  <Clipboard size={15} />
                </GlassButton>
              )}
            </div>
            <GlassButton
              className={styles.primaryButton}
              onClick={(e) => {
                e.stopPropagation();
                handleInspect();
              }}
              size="lg"
              intensity={6}
              disabled={loading}
            >
              <span>{loading ? "Inspecting" : "Find media"}</span>
              {loading ? <LoaderCircle size={18} className={styles.spin} /> : ""}
            </GlassButton>
          </CustomGlassInputCard>
        ) : (
          <CustomGlassInputCard className={styles.inputCard} style={{ maxWidth: "600px", margin: "0 auto" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "12px 8px", textAlign: "center", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "48px", height: "48px", borderRadius: "50%", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#ef4444", marginBottom: "8px" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <h2 style={{ fontSize: "1.4rem", fontWeight: "700", color: "#f5f5f1", margin: 0 }}>Backend Service Offline</h2>
              <p style={{ color: "var(--muted)", fontSize: "0.95rem", lineHeight: "1.6", margin: 0, maxWidth: "480px" }}>
                Our Hugging Face backend space has been flagged, making hosted downloads temporarily unavailable.
              </p>
              <p style={{ color: "#ef4444", fontSize: "0.9rem", fontWeight: "600", margin: 0 }}>
                However, you can run Downloader perfectly on your localhost!
              </p>
              <div style={{ width: "100%", height: "1px", background: "rgba(255, 255, 255, 0.08)", margin: "8px 0" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", alignItems: "center" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--muted)", fontWeight: "500" }}>Run these simple commands to host it locally:</span>
                <div style={{ background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "12px", padding: "12px", width: "100%", maxWidth: "440px", textAlign: "left", fontFamily: "monospace", fontSize: "0.82rem", color: "#38bdf8", overflowX: "auto", whiteSpace: "pre" }}>
{`git clone https://github.com/zakisheriff/Downloader-by-The-Atom.git
cd Downloader-by-The-Atom
npm install
npm run dev`}
                </div>
              </div>
              <GlassButton
                onClick={(e) => {
                  e.stopPropagation();
                  window.open("https://github.com/zakisheriff/Downloader-by-The-Atom", "_blank", "noopener,noreferrer");
                }}
                size="lg"
                intensity={8}
                style={{ marginTop: "12px", display: "inline-flex", alignItems: "center", gap: "10px", width: "100%", maxWidth: "280px", justifyContent: "center" }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
                View Setup on GitHub
              </GlassButton>
            </div>
          </CustomGlassInputCard>
        )}
      </GlassCard>

      {loading ? (
        <GlassCard className={styles.loadingCard}>
          <div className={styles.loadingLayout}>
            <div className={styles.loadingCopy}>
              <LoaderCircle size={22} className={styles.spin} />
              <div>
                <strong>Inspecting the source</strong>
                <p>Fetching title, thumbnail, duration, and the best direct format options.</p>
              </div>
            </div>
            <LoadingArcade />
          </div>
        </GlassCard>
      ) : null}

      {!loading && error ? (
        <GlassCard className={styles.errorCard}>
          <strong>We couldn&apos;t prepare that link.</strong>
          <p>{error}</p>
        </GlassCard>
      ) : null}

      {!loading && media ? (
        <div className={styles.resultGrid}>
          <GlassCard className={styles.previewCard}>
            <div className={styles.previewMedia}>
              {media.thumbnail ? (
                <img
                  src={
                    media.thumbnail && (media.thumbnail.includes("cdninstagram.com") || media.thumbnail.includes("instagram.com"))
                      ? media.thumbnail
                      : `${apiBase}/api/media/thumbnail?src=${encodeURIComponent(media.thumbnail)}`
                  }
                  alt={media.title}
                  referrerPolicy="no-referrer"
                  className={styles.thumbnail}
                />
              ) : (
                <div className={styles.thumbnailFallback}>No preview</div>
              )}
            </div>

            <div className={styles.previewCopy}>
              {(() => {
                const source = media.sourceName || "";
                const plat = PLATFORMS[source] || fallbackPlatform;
                return (
                  <div
                    className={styles.sourceBadge}
                    style={{
                      background: plat.bg,
                      border: `1px solid ${plat.border}`,
                      color: plat.color
                    }}
                  >
                    {plat.icon}
                    <span>{source}</span>
                  </div>
                );
              })()}
              <h2>{media.title}</h2>
              <p>{media.description || "Public media detected and ready for a format choice."}</p>

              <div className={styles.previewMeta}>
                {!isInstagramCarousel && !isImageOnly && (
                  <div>
                    <span>Duration</span>
                    <strong>{media.durationLabel}</strong>
                  </div>
                )}
                <div>
                  <span>Uploader</span>
                  <strong>{media.uploader || "Unknown"}</strong>
                </div>
                <div>
                  <span>{isInstagramCarousel ? "Slides" : "Formats"}</span>
                  <strong>
                    {isInstagramCarousel
                      ? `${visibleFormatsCount} ${visibleFormatsCount === 1 ? "slide" : "slides"}`
                      : `${visibleFormatsCount} ${visibleFormatsCount === 1 ? "option" : "options"}`}
                  </strong>
                </div>
              </div>
            </div>
          </GlassCard>

          <div className={styles.formatsBlock} id="supported">
            {media.serverWarning ? (
              <GlassCard className={styles.warningCard}>
                <strong>Server note</strong>
                <p>{media.serverWarning}</p>
              </GlassCard>
            ) : null}

            {isInstagramCarousel && (
              <GlassCard className={styles.bulkActionBar}>
                <div className={styles.bulkActionInfo}>
                  <strong>Carousel Slides</strong>
                  <span>{selectedFormatIds.size} of {media.formats.filter(f => f.id.startsWith("photo:")).length} selected</span>
                </div>
                <div className={styles.bulkActionButtons}>
                  {selectedFormatIds.size === media.formats.filter(f => f.id.startsWith("photo:")).length ? (
                    <GlassButton size="sm" intensity={4} onClick={handleDeselectAll}>
                      Deselect All
                    </GlassButton>
                  ) : (
                    <GlassButton size="sm" intensity={4} onClick={handleSelectAll}>
                      Select All
                    </GlassButton>
                  )}
                  <GlassButton
                    size="sm"
                    intensity={6}
                    disabled={selectedFormatIds.size === 0}
                    onClick={handleDownloadSelected}
                    className={styles.bulkDownloadBtn}
                  >
                    Download Selected
                  </GlassButton>
                </div>
              </GlassCard>
            )}

            {visibleVideoGroups.length ? (
              <div className={styles.groupSection}>
                <div className={styles.sectionHeading}>
                  <h3>{isInstagramCarousel || isImageOnly ? "Post / Images" : "Video"}</h3>
                </div>

                <div className={styles.groupStack}>
                  {visibleVideoGroups.map((group) => (
                    <GlassCard key={`video-${group.container}`} className={styles.groupCard}>
                      <div className={styles.groupHeader}>
                        <strong>{group.container}</strong>
                        <span>
                          {group.items.length}{" "}
                          {group.container === "IMAGE"
                            ? (group.items.length === 1 ? "image" : "images")
                            : group.container === "VIDEO" && isInstagramCarousel
                            ? (group.items.length === 1 ? "video" : "videos")
                            : (group.items.length === 1 ? "quality" : "qualities")}
                        </span>
                      </div>

                      <div className={group.container === "IMAGE" ? `${styles.formatsGrid} ${styles.imageGrid}` : styles.formatsGrid}>
                        {group.items.map((format) => {
                          const isSelectable = format.id.startsWith("photo:");
                          const isSelected = selectedFormatIds.has(format.id);
                          return (
                            <FormatCard
                              key={format.id}
                              format={format}
                              sourceUrl={media.sourceUrl}
                              mediaTitle={media.title}
                              selectable={isSelectable}
                              isSelected={isSelected}
                              onSelectToggle={() => {
                                const newSelection = new Set(selectedFormatIds);
                                if (newSelection.has(format.id)) {
                                  newSelection.delete(format.id);
                                } else {
                                  newSelection.add(format.id);
                                }
                                setSelectedFormatIds(newSelection);
                              }}
                            />
                          );
                        })}
                      </div>

                      {group.container === "IMAGE" && group.items.length > 1 && (
                        <div className={styles.carouselHintText}>
                          Tip: You can select multiple slides (or use the <strong>Select All</strong> button at the top) to download them all at once!
                        </div>
                      )}
                    </GlassCard>
                  ))}
                </div>
              </div>
            ) : null}

            {visibleAudioGroups.length ? (
              <div className={styles.groupSection}>
                <div className={styles.sectionHeading}>
                  <h3>Audio</h3>
                </div>

                <div className={styles.groupStack}>
                  {visibleAudioGroups.map((group) => (
                    <GlassCard key={`audio-${group.container}`} className={styles.groupCard}>
                      <div className={styles.groupHeader}>
                        <strong>{group.container}</strong>
                        <span>{group.items.length} {group.items.length === 1 ? "option" : "options"}</span>
                      </div>

                      <div className={styles.formatsGrid}>
                        {group.items.map((format) => (
                          <FormatCard
                            key={format.id}
                            format={format}
                            sourceUrl={media.sourceUrl}
                            mediaTitle={media.title}
                          />
                        ))}
                      </div>
                    </GlassCard>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {!loading && !media && !error ? (
        <EmptyState
          title="Nothing inspected yet"
          description="Paste a public media link above and the available formats will appear here."
        />
      ) : null}
      </div>
    </LiquidGlassFilter>
  );
}
