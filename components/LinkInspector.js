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
        <div className={styles.inputCard}>
          <div className={styles.inputWrap}>
            <Link2 size={18} />
            <input
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
              <span className="pill">{media.sourceName}</span>
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
