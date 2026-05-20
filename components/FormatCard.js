"use client";

import { useState } from "react";
import { ArrowDownToLine, LoaderCircle, Music4, PlaySquare } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import { useToast } from "@/components/providers/ToastProvider";
import styles from "@/components/FormatCard.module.css";

export default function FormatCard({ format, sourceUrl, mediaTitle }) {
  const [downloading, setDownloading] = useState(false);
  const { showToast } = useToast();
  const Icon = format.type === "audio" ? Music4 : PlaySquare;

  const handleDownload = async () => {
    const params = new URLSearchParams({
      url: sourceUrl,
      format: format.selector,
      mode: format.mode,
      ext: format.ext
    });

    setDownloading(true);

    try {
      const response = await fetch(`/api/media/download?${params.toString()}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        const message = await response.text().catch(() => "The file could not be prepared.");
        throw new Error(message || "The file could not be prepared.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `${mediaTitle}.${format.ext}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      showToast({
        title: "Download failed",
        description: error.message || "The file could not be prepared.",
        variant: "warning"
      });
    } finally {
      setDownloading(false);
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
      </div>

      <button onClick={handleDownload} className={styles.button} disabled={downloading}>
        {downloading ? <LoaderCircle size={16} className={styles.spin} /> : <ArrowDownToLine size={16} />}
        {downloading ? "Preparing..." : "Download"}
      </button>
    </GlassCard>
  );
}
