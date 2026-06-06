"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowDownToLine, Check, LoaderCircle, Music4, PlaySquare, Image } from "lucide-react";
import { GlassButton } from "@zakisheriff/liquid-glass";
import GlassCard from "@/components/GlassCard";
import LoadingArcade from "@/components/LoadingArcade";
import { useToast } from "@/components/providers/ToastProvider";
import styles from "@/components/FormatCard.module.css";

export default function FormatCard({ format, sourceUrl, mediaTitle, selectable, isSelected, onSelectToggle }) {
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState(null);
  const pollIntervalRef = useRef(null);
  const watchdogRef = useRef(null);
  const { showToast } = useToast();
  const Icon = format.type === "audio" ? Music4 : format.type === "image" ? Image : PlaySquare;
  const isBlocked = Boolean(format.disabled);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
      }
    };
  }, []);

  const handleDownload = async () => {
    if (isBlocked) {
      showToast({
        title: "Not available on this server",
        description: format.unavailableReason || "This format cannot be prepared on the current server yet.",
        variant: "warning"
      });
      return;
    }

    // Fast path: For Instagram photo/image formats with direct CDN URLs,
    // download directly in the browser instead of proxying through the server.
    // The user's browser isn't IP-blocked by Instagram CDN, unlike HF containers.
    const isDirectCdnImage = format.mode === "direct" &&
      format.selector?.startsWith("https://") &&
      (format.ext === "jpg" || format.ext === "jpeg" || format.ext === "png" || format.ext === "webp");

    if (isDirectCdnImage) {
      setDownloading(true);
      setDownloadProgress(0);
      setDownloadStatus("Downloading...");
      try {
        const res = await fetch(format.selector);
        if (!res.ok) throw new Error(`CDN fetch failed: ${res.status}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${mediaTitle || "download"}_${format.label || "image"}.${format.ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setDownloadProgress(100);
        setDownloadStatus("Completed!");
        showToast({
          title: "Download started",
          description: "Image saved to your downloads folder.",
          variant: "success"
        });
        setTimeout(() => {
          setDownloading(false);
          setDownloadStatus(null);
          setDownloadProgress(0);
        }, 2000);
        return;
      } catch (directErr) {
        console.warn("Direct CDN download failed, falling back to server proxy:", directErr.message);
        // Fall through to server proxy path below
        setDownloading(false);
        setDownloadStatus(null);
        setDownloadProgress(0);
      }
    }

    const apiBase = process.env.NEXT_PUBLIC_API_URL ||
      (typeof window !== "undefined" &&
       (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.hostname === "[::1]" ||
        window.location.hostname.startsWith("192.168."))
       ? ""
       : "https://zakisheriff-downloader-backend.hf.space");

    // All formats go through the background prepare → poll → ready flow.
    // Direct stdout-piping to the browser is unreliable (YouTube throttles,
    // partial data, broken files). The server-side temp-file approach is the
    // only method that consistently produces a complete, valid file.
    setDownloading(true);
    setDownloadProgress(0);
    setDownloadStatus("Starting...");

    const downloadId = Math.random().toString(36).substring(2, 10);
    let pollingStarted = false;

    try {
      const prepareParams = new URLSearchParams({
        url: sourceUrl,
        format: format.selector,
        mode: format.mode,
        ext: format.ext,
        id: downloadId,
        formatId: format.id,
        prepare: "true"
      });

      const response = await fetch(`${apiBase}/api/media/download?${prepareParams.toString()}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        const message = await response.text().catch(() => "The download could not be prepared.");
        throw new Error(message || "The download could not be prepared.");
      }

      showToast({
        title: "Preparing download",
        description: "Your file is being prepared on the server. You can monitor the progress on the button.",
        variant: "info"
      });

      const resetWatchdog = () => {
        if (watchdogRef.current) {
          clearTimeout(watchdogRef.current);
        }
        watchdogRef.current = setTimeout(() => {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setDownloading(false);
          setDownloadStatus(null);
          setDownloadProgress(0);
          showToast({
            title: "Download timed out",
            description: "The server took too long to prepare this file. Try again or pick a different quality.",
            variant: "warning"
          });
        }, 90_000);
      };

      pollingStarted = true;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      resetWatchdog();

      pollIntervalRef.current = setInterval(async () => {
        try {
          const res = await fetch(`${apiBase}/api/media/status?id=${downloadId}`, { cache: "no-store" });
          if (!res.ok) return;
          const data = await res.json();

          if (data.status === "queued") {
            setDownloadProgress(0);
            setDownloadStatus(`Waiting in line (#${data.position || 1})`);
            resetWatchdog(); // Reset watchdog while waiting in queue
          } else if (data.status === "downloading") {
            const p = Math.round(data.progress || 0);
            setDownloadProgress(p);
            setDownloadStatus(`Downloading... ${p}%`);
            resetWatchdog(); // Reset watchdog on active download progress
          } else if (data.status === "merging") {
            setDownloadProgress(99);
            setDownloadStatus(format.type === "audio" ? "Extracting audio..." : "Merging formats...");
            resetWatchdog(); // Reset watchdog on active merge progress
          } else if (data.status === "completed") {
            setDownloadProgress(100);
            setDownloadStatus("Completed!");
            if (watchdogRef.current) {
              clearTimeout(watchdogRef.current);
              watchdogRef.current = null;
            }

            // Trigger the native browser download — file is fully ready on server
            const downloadParams = new URLSearchParams({
              url: sourceUrl,
              format: format.selector,
              mode: format.mode,
              ext: format.ext,
              id: downloadId,
              formatId: format.id,
              ready: "true"
            });
            window.location.href = `${apiBase}/api/media/download?${downloadParams.toString()}`;

            showToast({
              title: "Download started",
              description: "Your browser has begun downloading the prepared media file.",
              variant: "success"
            });

            setTimeout(() => {
              setDownloading(false);
              setDownloadStatus(null);
              setDownloadProgress(0);
            }, 5000); // Extended Completed display from 1.5s to 5s

            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          } else if (data.status === "failed") {
            setDownloading(false);
            setDownloadStatus(null);
            setDownloadProgress(0);
            if (watchdogRef.current) {
              clearTimeout(watchdogRef.current);
              watchdogRef.current = null;
            }
            showToast({
              title: "Download failed",
              description: data.error || "The download task failed on the server.",
              variant: "warning"
            });
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          }
        } catch (e) {
          // Keep polling, ignore temporary fetch/server hiccups
        }
      }, 350);

    } catch (error) {
      showToast({
        title: "Download failed",
        description: error.message || "The file could not be prepared.",
        variant: "warning"
      });
      if (!pollingStarted) {
        setDownloading(false);
        setDownloadStatus(null);
        setDownloadProgress(0);
      }
    }
  };

  const handleCardClick = (e) => {
    if (selectable && e.target.tagName !== "BUTTON" && !e.target.closest("button") && !e.target.closest("a")) {
      onSelectToggle();
    }
  };

  const apiBase = process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== "undefined" &&
     (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "[::1]" ||
      window.location.hostname.startsWith("192.168."))
     ? ""
     : "https://zakisheriff-downloader-backend.hf.space");

  const isCdnInstagram = format.thumbnail && (format.thumbnail.includes("cdninstagram.com") || format.thumbnail.includes("instagram.com"));
  const thumbnailSrc = isCdnInstagram
    ? format.thumbnail
    : `${apiBase}/api/media/thumbnail?src=${encodeURIComponent(format.thumbnail)}`;

  return (
    <GlassCard
      className={`${styles.card} ${selectable ? styles.selectableCard : ""} ${isSelected ? styles.selectedCard : ""}`}
      onClick={handleCardClick}
    >
      {selectable && (
        <div 
          className={`${styles.checkboxWrap} ${isSelected ? styles.checkboxSelected : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelectToggle();
          }}
        >
          {isSelected ? <Check size={12} className={styles.checkboxCheckIcon} /> : null}
        </div>
      )}

      {selectable ? (
        <div className={styles.compactImageSlideBody}>
          <div className={styles.compactThumbnailWrap}>
            <img
              src={thumbnailSrc}
              alt={format.label}
              referrerPolicy="no-referrer"
              className={styles.compactFormatThumbnail}
            />
          </div>
        </div>
      ) : (
        <>
          <div className={styles.top}>
            <div className={format.thumbnail ? styles.thumbnailWrap : styles.iconWrap}>
              {format.thumbnail ? (
                <img
                  src={thumbnailSrc}
                  alt={format.label}
                  referrerPolicy="no-referrer"
                  className={styles.formatThumbnail}
                />
              ) : (
                <Icon size={18} />
              )}
            </div>
            <div className={styles.copy}>
              <strong>{format.label}</strong>
              <span>{format.note || "Ready to download"}</span>
            </div>
          </div>

          <div className={styles.meta}>
            <span>{format.type === "audio" ? "Audio" : format.type === "image" ? "Image" : "Video"}</span>
            <span>{format.sizeLabel}</span>
            <span>{format.ext.toUpperCase()}</span>
            {isBlocked ? <span>Unavailable</span> : null}
          </div>
        </>
      )}

      <GlassButton
        onClick={handleDownload}
        className={styles.button}
        disabled={downloading || isBlocked}
        size="lg"
        intensity={6}
        style={{
          width: "100%",
          ...(downloading && downloadProgress > 0 ? {
            "--glass-surface-background": `linear-gradient(to right, rgba(255, 255, 255, 0.16) ${downloadProgress}%, transparent ${downloadProgress}%)`
          } : {})
        }}
      >
        {downloading ? <LoaderCircle size={16} className={styles.spin} /> : <ArrowDownToLine size={16} />}
        {downloading ? (downloadStatus || "Preparing...") : isBlocked ? "Unavailable" : "Download"}
      </GlassButton>

      {downloading ? (
        <div className={styles.arcadeWrap}>
          <LoadingArcade
            compact
            title="Play while it prepares"
            subtitle="A tiny break while this file gets ready."
          />
        </div>
      ) : null}
    </GlassCard>
  );
}
