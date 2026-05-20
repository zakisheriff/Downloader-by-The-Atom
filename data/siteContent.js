export const heroNotes = [
  { label: "No account flow", value: "Paste link and choose format" },
  { label: "Supported", value: "YouTube, Instagram, TikTok, X and more" },
  { label: "Download style", value: "Direct browser save" }
];

export const landingFeatures = [
  {
    title: "Paste any public media link",
    description: "Drop in a supported YouTube, Instagram, TikTok, X, Facebook, or direct media URL without extra steps."
  },
  {
    title: "Choose a clean format",
    description: "The app inspects the source, finds practical video and audio options, and presents them in a simple quality list."
  },
  {
    title: "Save it directly",
    description: "Once you pick a format, the file streams straight to the browser so the final action feels immediate."
  }
];

export const landingSteps = [
  {
    title: "Paste",
    copy: "Drop in the post or video link from the platform you want to download from."
  },
  {
    title: "Choose",
    copy: "Review the detected media, thumbnail, duration, and available formats or qualities."
  },
  {
    title: "Download",
    copy: "Pick the option you want and let the browser save the file cleanly to your device."
  }
];

export const supportedPlatforms = [
  { title: "YouTube", description: "Short-form, long-form, channel uploads, and common public watch links." },
  { title: "Instagram", description: "Reels, posts, and supported public media pages with direct extraction when available." },
  { title: "TikTok", description: "Public video links with clean single-file download flow." },
  { title: "X / Twitter", description: "Tweet videos and common public share links." },
  { title: "Facebook", description: "Public video links when extraction is available from the server runtime." },
  { title: "Direct media", description: "Any compatible public link that yt-dlp can resolve from the host environment." }
];

export const faqs = [
  {
    question: "Does this need a real backend?",
    answer: "Yes. The app runs a server-side media extraction flow, so it needs a persistent Node environment with yt-dlp installed."
  },
  {
    question: "Why do some links fail?",
    answer: "Some platforms restrict private or region-locked media. Public links work best, and the host may also need yt-dlp and ffmpeg installed."
  },
  {
    question: "Can I deploy this on Vercel?",
    answer: "Not if you expect reliable real downloads. Use a persistent Node host or VPS where yt-dlp can run directly."
  }
];
