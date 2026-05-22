import Link from "next/link";
import styles from "@/app/blog/blog.module.css";

export const metadata = {
  title: "How to Download YouTube Videos for Free (Up to 4K)",
  description: "Step-by-step guide to downloading any YouTube video in 4K, 1080p, 720p, or MP3 — completely free and without installing any software.",
  keywords: ["download YouTube video free", "YouTube downloader", "save YouTube video", "YouTube to MP4", "YouTube 4K download"],
  alternates: { canonical: "/blog/how-to-download-youtube-videos-free" },
  openGraph: {
    title: "How to Download YouTube Videos for Free (Up to 4K)",
    description: "Step-by-step guide to downloading any YouTube video for free — 4K, 1080p, 720p or MP3.",
    type: "article",
    publishedTime: "2025-01-15",
    authors: ["The Atom"]
  }
};

export default function Post() {
  return (
    <main className={styles.article}>
      <Link href="/blog" className={styles.backLink}>All guides</Link>

      <header className={styles.articleHeader}>
        <span className={styles.articleTag}>YouTube</span>
        <h1 className={styles.articleTitle}>How to Download YouTube Videos for Free (All Qualities up to 4K)</h1>
        <div className={styles.articleMeta}>
          <span>January 15, 2025</span>
          <span>·</span>
          <span>4 min read</span>
        </div>
      </header>

      <div className={styles.articleBody}>
        <p>
          Want to save a YouTube video to watch offline, share it, or keep it for later? 
          <strong> Downloader by The Atom</strong> lets you download any public YouTube video — up to 4K resolution — 
          completely free, with no account and no software to install.
        </p>

        <h2>Step-by-Step: Download a YouTube Video</h2>
        <ol>
          <li><strong>Copy the YouTube link.</strong> Open YouTube, find the video you want, and copy the URL from your browser address bar (e.g. <code>https://youtube.com/watch?v=...</code>).</li>
          <li><strong>Paste it into the downloader.</strong> Go to <strong>downloader.theatom.lk</strong>, paste the link into the input field, and click <em>Find Media</em>.</li>
          <li><strong>Wait a few seconds.</strong> The tool inspects the video and fetches all available formats — from 144p up to 4K, plus audio-only options.</li>
          <li><strong>Choose your quality.</strong> Pick the resolution and format you want (MP4, WEBM, MP3, M4A).</li>
          <li><strong>Click Download.</strong> The server prepares your file and your browser saves it automatically when ready.</li>
        </ol>

        <h2>What Qualities Are Available?</h2>
        <p>Downloader by The Atom supports every resolution YouTube provides for a video:</p>
        <ul>
          <li><strong>Video:</strong> 144p, 240p, 360p, 480p, 720p, 1080p, 1440p, 2160p (4K)</li>
          <li><strong>Formats:</strong> MP4 and WEBM</li>
          <li><strong>Audio only:</strong> M4A (original), WEBM audio, and MP3 (converted)</li>
        </ul>
        <p>4K and 1440p videos require a server-side merge of the video and audio tracks, which the tool handles automatically in the background.</p>

        <h2>Is It Free?</h2>
        <p>
          Yes, completely. Downloader by The Atom has no subscription fees, no ads, and no sign-up required. 
          It runs on a free Hugging Face backend with 16 GB of RAM, so it can handle high-quality 4K video merging without crashing.
        </p>

        <h2>Does It Work on Mobile?</h2>
        <p>
          Yes. Open <strong>downloader.theatom.lk</strong> in your mobile browser (Chrome, Safari, Firefox), paste a link, and download directly to your device. 
          On iOS, you may need to use the "Files" app to find the saved video.
        </p>

        <h2>Why Not Just Use YouTube's Offline Feature?</h2>
        <p>
          YouTube's offline mode only works inside the YouTube app, locks the file to your device, and requires a Premium subscription. 
          Downloading via Downloader by The Atom gives you a real video file that you can play anywhere, share, edit, or archive.
        </p>

        <h2>Supported YouTube Link Formats</h2>
        <ul>
          <li>Standard watch links: <code>youtube.com/watch?v=...</code></li>
          <li>Shortened links: <code>youtu.be/...</code></li>
          <li>Shorts: <code>youtube.com/shorts/...</code></li>
          <li>Embedded links: <code>youtube.com/embed/...</code></li>
        </ul>

        <div className={styles.ctaBox}>
          <p>Ready to download? Paste your YouTube link below and get started for free.</p>
          <Link href="/dashboard" className={styles.ctaButton}>Open Downloader</Link>
        </div>
      </div>
    </main>
  );
}
