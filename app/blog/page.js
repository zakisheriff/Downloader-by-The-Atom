import Link from "next/link";
import styles from "@/app/blog/blog.module.css";

export const metadata = {
  title: "Blog — Video Downloader Tips & Guides",
  description: "Free guides on how to download YouTube videos, Instagram Reels, TikTok clips, and more. Tips, tricks, and step-by-step tutorials from Downloader by The Atom.",
  alternates: { canonical: "/blog" }
};

const posts = [
  {
    slug: "how-to-download-youtube-videos-free",
    title: "How to Download YouTube Videos for Free (All Qualities up to 4K)",
    description: "Step-by-step guide to downloading any YouTube video in 4K, 1080p, 720p, or MP3 — completely free and without installing any software.",
    date: "2025-01-15",
    readTime: "4 min read",
    tag: "YouTube"
  },
  {
    slug: "how-to-download-instagram-reels",
    title: "How to Download Instagram Reels — Save Any Reel to Your Device",
    description: "The easiest way to save Instagram Reels, posts, and videos to your phone or computer without logging in or installing an app.",
    date: "2025-01-20",
    readTime: "3 min read",
    tag: "Instagram"
  },
  {
    slug: "how-to-download-tiktok-videos-without-watermark",
    title: "How to Download TikTok Videos Without Watermark",
    description: "Download TikTok videos in full quality without the floating TikTok logo watermark, for free and in seconds.",
    date: "2025-02-01",
    readTime: "3 min read",
    tag: "TikTok"
  },
  {
    slug: "best-free-youtube-downloader-2025",
    title: "Best Free YouTube Downloader in 2025 (No Ads, No Signup)",
    description: "A comparison of the top free YouTube downloaders in 2025. Find out which tools actually work, which are safe, and which ones are riddled with ads.",
    date: "2025-02-10",
    readTime: "6 min read",
    tag: "YouTube"
  },
  {
    slug: "youtube-to-mp3-converter-free",
    title: "YouTube to MP3 Converter — Download Audio for Free",
    description: "Convert any YouTube video to MP3 and download the audio track in the best available quality with no file size limits.",
    date: "2025-02-18",
    readTime: "4 min read",
    tag: "Audio"
  },
  {
    slug: "download-4k-youtube-videos",
    title: "How to Download 4K YouTube Videos (2160p UHD)",
    description: "Full guide to downloading 4K and 1440p YouTube videos in the highest possible quality, including which tools support true 4K merging.",
    date: "2025-03-01",
    readTime: "5 min read",
    tag: "YouTube"
  }
];

export default function BlogIndex() {
  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1>Guides & Tips</h1>
        <p>How to download videos from YouTube, Instagram, TikTok, and more — step‑by‑step.</p>
      </div>

      <div className={styles.grid}>
        {posts.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className={styles.card}>
            <div className={styles.cardTag}>{post.tag}</div>
            <h2 className={styles.cardTitle}>{post.title}</h2>
            <p className={styles.cardDesc}>{post.description}</p>
            <div className={styles.cardMeta}>
              <span>{new Date(post.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
              <span>·</span>
              <span>{post.readTime}</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
