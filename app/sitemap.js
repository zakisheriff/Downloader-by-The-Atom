export default function sitemap() {
  const baseUrl = "https://downloader.theatom.lk";
  const now = new Date();

  const staticRoutes = [
    { path: "", changeFrequency: "daily", priority: 1.0 },
    { path: "/dashboard", changeFrequency: "weekly", priority: 0.9 },
    { path: "/settings", changeFrequency: "monthly", priority: 0.5 },
    { path: "/blog", changeFrequency: "weekly", priority: 0.8 },
    { path: "/blog/how-to-download-youtube-videos-free", changeFrequency: "monthly", priority: 0.9 },
    { path: "/blog/how-to-download-instagram-reels", changeFrequency: "monthly", priority: 0.9 },
    { path: "/blog/how-to-download-tiktok-videos-without-watermark", changeFrequency: "monthly", priority: 0.9 },
    { path: "/blog/best-free-youtube-downloader-2025", changeFrequency: "monthly", priority: 0.85 },
    { path: "/blog/youtube-to-mp3-converter-free", changeFrequency: "monthly", priority: 0.85 },
    { path: "/blog/download-4k-youtube-videos", changeFrequency: "monthly", priority: 0.85 }
  ];

  return staticRoutes.map(({ path, changeFrequency, priority }) => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
    changeFrequency,
    priority
  }));
}
