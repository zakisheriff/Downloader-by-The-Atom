"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Copy, Link2, LoaderCircle, X } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import FormatCard from "@/components/FormatCard";
import GlassCard from "@/components/GlassCard";
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

  useEffect(() => {
    const currentUrl = searchParams.get("url") || "";
    setInput(currentUrl);

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

  const handleClear = () => {
    setInput("");
    setMedia(null);
    setError("");
    router.replace("/dashboard");
  };

  return (
    <div className={styles.page}>
      <GlassCard className={styles.hero}>
        <p className={styles.inputHeading}>Paste the link.</p>
        <div className={styles.inputCard} onClick={handleContainerClick}>
          <div className={styles.inputWrap}>
            <Link2 size={18} />
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInspect()}
              placeholder="Paste https://youtube.com/... or any supported public link"
            />
            {input && (
              <>
                <button
                  className={styles.iconBtn}
                  onClick={handleCopy}
                  title={copied ? "Copied!" : "Copy link"}
                  aria-label="Copy link"
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                </button>
                <button
                  className={styles.iconBtn}
                  onClick={handleClear}
                  title="Clear"
                  aria-label="Clear input"
                >
                  <X size={15} />
                </button>
              </>
            )}
          </div>
          <button className={styles.primaryButton} onClick={handleInspect}>
            <span>{loading ? "Inspecting" : "Find media"}</span>
            {loading ? <LoaderCircle size={18} className={styles.spin} /> : ""}
          </button>
        </div>
      </GlassCard>

      {loading ? (
        <GlassCard className={styles.loadingCard}>
          <div className={styles.loadingCopy}>
            <LoaderCircle size={22} className={styles.spin} />
            <div>
              <strong>Inspecting the source</strong>
              <p>Fetching title, thumbnail, duration, and the best direct format options.</p>
            </div>
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
                  src={`${apiBase}/api/media/thumbnail?src=${encodeURIComponent(media.thumbnail)}`}
                  alt={media.title}
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
                <div>
                  <span>Duration</span>
                  <strong>{media.durationLabel}</strong>
                </div>
                <div>
                  <span>Uploader</span>
                  <strong>{media.uploader || "Unknown"}</strong>
                </div>
                <div>
                  <span>Formats</span>
                  <strong>{visibleFormatsCount} options</strong>
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

            {visibleVideoGroups.length ? (
              <div className={styles.groupSection}>
                <div className={styles.sectionHeading}>
                  <h3>Video</h3>
                </div>

                <div className={styles.groupStack}>
                  {visibleVideoGroups.map((group) => (
                    <GlassCard key={`video-${group.container}`} className={styles.groupCard}>
                      <div className={styles.groupHeader}>
                        <strong>{group.container}</strong>
                        <span>{group.items.length} {group.items.length === 1 ? "quality" : "qualities"}</span>
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
  );
}
