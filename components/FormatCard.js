"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowDownToLine, LoaderCircle, Music4, PlaySquare } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import { useToast } from "@/components/providers/ToastProvider";
import styles from "@/components/FormatCard.module.css";

export default function FormatCard({ format, sourceUrl, mediaTitle }) {
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState(null);
  const pollIntervalRef = useRef(null);
  const { showToast } = useToast();
  const Icon = format.type === "audio" ? Music4 : PlaySquare;
  const isBlocked = Boolean(format.disabled);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
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

    setDownloading(true);
    setDownloadProgress(0);
    setDownloadStatus("Starting...");

    const downloadId = Math.random().toString(36).substring(2, 10);
    let pollingStarted = false;

    try {
      const validationParams = new URLSearchParams({
        url: sourceUrl,
        format: format.selector,
        mode: format.mode,
        ext: format.ext,
        validate: "true"
      });

      const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
      const response = await fetch(`${apiBase}/api/media/download?${validationParams.toString()}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        const message = await response.text().catch(() => "The file could not be prepared.");
        throw new Error(message || "The file could not be prepared.");
      }

      showToast({
        title: "Preparing download",
        description: "Your file is being prepared on the server and will download natively in your browser shortly.",
        variant: "info"
      });

      const downloadParams = new URLSearchParams({
        url: sourceUrl,
        format: format.selector,
        mode: format.mode,
        ext: format.ext,
        id: downloadId
      });

      pollingStarted = true;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      pollIntervalRef.current = setInterval(async () => {
        try {
          const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
          const res = await fetch(`${apiBase}/api/media/status?id=${downloadId}`, { cache: "no-store" });
          if (!res.ok) return;
          const data = await res.json();

          if (data.status === "downloading") {
            const p = Math.round(data.progress || 0);
            setDownloadProgress(p);
            setDownloadStatus(`Downloading... ${p}%`);
          } else if (data.status === "merging") {
            setDownloadProgress(99);
            setDownloadStatus("Merging formats...");
          } else if (data.status === "completed") {
            setDownloadProgress(100);
            setDownloadStatus("Completed!");
            setTimeout(() => {
              setDownloading(false);
              setDownloadStatus(null);
              setDownloadProgress(0);
            }, 1000);
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
          } else if (data.status === "failed") {
            setDownloading(false);
            setDownloadStatus(null);
            setDownloadProgress(0);
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
      }, 800);

      window.location.href = `${apiBase}/api/media/download?${downloadParams.toString()}`;
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

  return (
    <GlassCard className={styles.card}>
      <div className={styles.top}>
        <div className={styles.iconWrap}>
          <Icon size={18} />
        </div>
        <div className={styles.copy}>
          <strong>{format.label}</strong>
          <span>{format.note || "Ready to download"}</span>
        </div>
      </div>

      <div className={styles.meta}>
        <span>{format.type === "audio" ? "Audio" : "Video"}</span>
        <span>{format.sizeLabel}</span>
        <span>{format.ext.toUpperCase()}</span>
        {isBlocked ? <span>Unavailable</span> : null}
      </div>

      <button
        onClick={handleDownload}
        className={styles.button}
        disabled={downloading || isBlocked}
        style={{
          background: downloading && downloadProgress > 0
            ? `linear-gradient(to right, rgba(255, 255, 255, 0.16) ${downloadProgress}%, transparent ${downloadProgress}%), linear-gradient(180deg, #111111, #050505)`
            : undefined
        }}
      >
        {downloading ? <LoaderCircle size={16} className={styles.spin} /> : <ArrowDownToLine size={16} />}
        {downloading ? (downloadStatus || "Preparing...") : isBlocked ? "Unavailable" : "Download"}
      </button>
    </GlassCard>
  );
}
