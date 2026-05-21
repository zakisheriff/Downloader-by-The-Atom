export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"]
      }
    ],
    sitemap: "https://downloader.theatom.lk/sitemap.xml",
    host: "https://downloader.theatom.lk"
  };
}
