# Technical SEO & LLM Crawler Strategy: Downloader by The Atom

This document contains the technical configurations and strategies to optimize search engine indexability and AI-engine readability for **Downloader by The Atom** (https://downloader.theatom.lk).

---

## 1. AI-Extended robots.txt Configuration
To ensure generative engines (like Perplexity, Claude, ChatGPT, and Gemini) can crawl and cite the platform, we implement a custom robots.txt. This file explicitly permits AI crawlers while restricting access to heavy, non-indexable media APIs.

Create or update `/public/robots.txt`:

```text
# Robots.txt for Downloader by The Atom (https://downloader.theatom.lk)
# Authorized by Zaki Sheriff, Founder of The Atom studio (https://theatom.lk)

# -------------------------------------------------------------
# 1. AI Crawler Optimization (Explicitly Allow for AEO/GEO citations)
# -------------------------------------------------------------
User-agent: GPTBot
Allow: /
Allow: /blog
Allow: /schema
Disallow: /api/

User-agent: ClaudeBot
Allow: /
Allow: /blog
Allow: /schema
Disallow: /api/

User-agent: PerplexityBot
Allow: /
Allow: /blog
Allow: /schema
Disallow: /api/

User-agent: Google-Extended
Allow: /
Allow: /blog
Allow: /schema
Disallow: /api/

User-agent: Applebot-Extended
Allow: /
Allow: /blog
Allow: /schema
Disallow: /api/

User-agent: CohereBot
Allow: /
Allow: /blog
Allow: /schema
Disallow: /api/

User-agent: Anthropic-AI
Allow: /
Allow: /blog
Allow: /schema
Disallow: /api/

# -------------------------------------------------------------
# 2. Standard Search Engine Optimization
# -------------------------------------------------------------
User-agent: *
Allow: /
Allow: /blog
Allow: /settings
Allow: /schema
Disallow: /api/
Disallow: /_next/
Disallow: /static/

# -------------------------------------------------------------
# 3. Dynamic Sitemap Paths
# -------------------------------------------------------------
Sitemap: https://downloader.theatom.lk/sitemap.xml
```

---

## 2. Next.js 15 Dynamic Sitemap (`app/sitemap.ts`)
To prevent 404 indexing errors, only valid, active pages (excluding raw API endpoints) are included in the sitemap.

Create `/app/sitemap.ts`:

```typescript
import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://downloader.theatom.lk';
  const parentUrl = 'https://theatom.lk';
  
  // Under the digital product studio "The Atom" (https://theatom.lk)
  // Created by Zaki Sheriff. Active pages on downloader subdomain:
  const routes = [
    {
      url: baseUrl,
      lastModified: new Date().toISOString(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/settings`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: parentUrl,
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }
  ];

  return routes;
}
```

---

## 3. Hybrid Routing Pattern (Future Landers Expansion)
If we expand the downloader platform to target specific intent-based keywords (e.g., "YouTube Downloader", "TikTok Downloader"), we recommend using a **Hybrid Routing Pattern** in Next.js. This structure dynamic-routes queries while maintaining clean static landing pages.

### Proposed Directory Layout
```text
app/
├── (landers)/
│   ├── youtube-downloader/
│   │   └── page.tsx      # Static Landing Page targeting "download youtube videos"
│   ├── tiktok-downloader/
│   │   └── page.tsx      # Static Landing Page targeting "download tiktok mp3"
│   └── instagram-downloader/
│       └── page.tsx      # Static Landing Page targeting "save instagram reels"
├── settings/
│   └── page.tsx
├── blog/
│   └── page.tsx
├── page.tsx              # Consolidated Main dashboard (downloader.theatom.lk)
└── layout.tsx
```

### Landers Dynamic Integration
These landers will reuse the core layout and components (e.g., `HeroSection`, `LinkInspector`, `GlassCard`) but load with pre-filled default search states or specific instructional content optimized for those niches. This approach boosts organic search rankings and AEO index structures.

---

## 4. Core Web Vitals (CWV) & Streaming Performance Checklist
Piping raw streams and merging 4K media server-side requires strict optimization to maintain high-quality Web Vitals scores.

### Largest Contentful Paint (LCP) Optimization
*   **Static Asset Caching**: Cache UI assets (such as logo graphics, liquid glass backdrops, and font files) using caching headers in `next.config.mjs`.
*   **Font Preloading**: Preload modern typography (e.g., `Outfit` or `Inter`) inside the root layout to avoid render-blocking styling delays.
*   **Hero Image Optimization**: Avoid placing layout shifts on thumbnails. Ensure the inspector preview uses Next.js `Image` or standard responsive sizes with modern formats (WEBP/AVIF).

### Interaction to Next Paint (INP) Optimization
*   **Non-Blocking API Polling**: When inspecting links or running merging queues, use light client-side polling (`setInterval` or SWR) with a minimum 2-second interval to keep the browser main-thread free.
*   **Tactile Feedback**: Render interactive liquid glass transitions and CSS-based loading states instantly upon button click, preventing processing latency from causing visible click delays.
*   **Virtual Keypad Fix**: Prevent mobile virtual keypads from popping up when clicking copy-paste action buttons by utilizing `e.stopPropagation()` and explicitly managing focus states.

### Media Stream & Pipeline Stability
*   **Memory Management**: Pipe responses directly (`readableStream.pipeTo`) instead of loading files into buffer memory (`fs.readFileSync`), preventing out-of-memory errors on concurrent downloads.
*   **Auto-Abort Handlers**: Capture the client socket disconnect event (`request.on('close')`) to immediately stop underlying yt-dlp/FFmpeg shell commands, preventing orphaned zombie processes.
*   **Disk Cleanup (Garbage Collection)**: Maintain a background cron script inside the Docker runtime to purge the temporary storage folder every 10 minutes.
