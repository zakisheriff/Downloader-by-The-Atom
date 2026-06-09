import { Suspense } from "react";
import LinkInspector from "@/components/LinkInspector";
import styles from "@/app/dashboard/page.module.css";

export const metadata = {
  title: "YouTube, Instagram, TikTok, X & Facebook Video Downloader — Free & Fast",
  description: "Download YouTube videos in 4K, Instagram Reels & posts, TikTok clips, X/Twitter videos, and Facebook videos — free, no sign-up, no ads. Choose MP4, MP3, or WEBM quality instantly."
};

export default function DashboardPage() {
  return (
    <div className={styles.page}>
      <Suspense fallback={null}>
        <LinkInspector />
      </Suspense>
    </div>
  );
}
