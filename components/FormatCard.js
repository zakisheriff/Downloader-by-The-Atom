"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowDownToLine, LoaderCircle, Music4, PlaySquare } from "lucide-react";
import { GlassButton } from "@zakisheriff/liquid-glass";
import GlassCard from "@/components/GlassCard";
import LoadingArcade from "@/components/LoadingArcade";
import { useToast } from "@/components/providers/ToastProvider";
import styles from "@/components/FormatCard.module.css";

export default function FormatCard({ format, sourceUrl, mediaTitle }) {
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState(null);
  const pollIntervalRef = useRef(null);
  const watchdogRef = useRef(null);
  const { showToast } = useToast();
  const Icon = format.type === "audio" ? Music4 : PlaySquare;
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
