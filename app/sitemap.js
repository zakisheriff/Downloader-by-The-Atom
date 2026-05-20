export default function sitemap() {
  const baseUrl = "https://fetch.theatom.lk";
  const now = new Date();

  return ["", "/dashboard", "/settings"].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.8
  }));
}
