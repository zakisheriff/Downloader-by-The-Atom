export default function manifest() {
  return {
    name: "Downloader by The Atom",
    short_name: "Downloader",
    description: "Paste a public media link, choose a format, and save it cleanly.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f5f1",
    theme_color: "#f5f5f1",
    icons: [
      {
        src: "/Logo.png",
        sizes: "512x512",
        type: "image/png"
      },
      {
        src: "/apple-icon.png",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };
}
