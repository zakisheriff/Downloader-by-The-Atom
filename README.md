---
title: Downloader Backend
emoji: 📥
colorFrom: purple
colorTo: blue
sdk: docker
app_port: 7860
---

# <div align="center">Downloader by The Atom</div>

<div align="center">
<strong>100% Free, High-Performance Media Downloader</strong>
</div>

<br />

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react&logoColor=white)
![yt-dlp](https://img.shields.io/badge/yt--dlp-Latest-red?style=for-the-badge&logo=youtube&logoColor=white)
![FFmpeg](https://img.shields.io/badge/FFmpeg-Latest-007800?style=for-the-badge&logo=ffmpeg&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

<br />

<a href="https://downloader.theatom.lk">
<img src="https://img.shields.io/badge/View%20Live%20Site-Click%20Here-0071e3?style=for-the-badge&logo=safari&logoColor=white" height="50" />
</a>

<br />
<br />

**[Visit Live Site: https://downloader.theatom.lk](https://downloader.theatom.lk)**

</div>

<br />

> **"Downloading media from the web should be clean, direct, and free."**
>
> Downloader by The Atom is a beautiful, self-hosted web app built for users who want to grab video and audio from popular platforms without dealing with pop-ups, shady ads, or paid speed caps.

---

## 🌟 Vision

Downloader by The Atom is designed with three core principles:

- **100% Free Forever**: No sign-ups, no subscription tiers, no speed limits, and zero ads.
- **Privacy First**: We don't track your downloads or logs. It runs completely self-hosted or via free Docker instances.
- **Sleek Premium UI**: An elegant dark layout with micro-interactions, smooth scrolling, and glassy panels that look great on any screen.

---

## ✨ Why Downloader by The Atom?

Most media downloading websites are cluttered with ads, tracking cookies, and fake download buttons.
Downloader by The Atom focuses strictly on the media delivery:

- Paste a URL (YouTube, TikTok, Instagram, X/Twitter, etc.)
- Inspect all available video and audio streams
- Merge high-definition video with high-quality audio on the fly
- Directly save or extract MP3 audio files without third-party redirects

---

## 🎨 Product Design

- **Minimalist Aesthetic**
  A spacious, clutter-free dashboard centered entirely around the link input.
- **Dark Premium Interface**
  Styled using custom vanilla CSS modules featuring smooth HSL gradients, deep gray/black backdrops, and glassmorphic panels.
- **High-Radius Border System**
  Consistent use of the signature 35px rounded corners for a modern, tactile card look.
- **Fluid UI Animations**
  Responsive animations powered by Framer Motion and smooth kinetic inertia scrolling powered by Lenis.

---

## ⚙️ Robust Download Engine

- **yt-dlp Backend Integration**
  Downloads are processed directly on the server through the robust, open-source `yt-dlp` tool.
- **Dynamic HD Video Merging**
  Many platforms serve high-definition video (1080p, 1440p, 4K) separately from audio. The backend automatically downloads both streams and merges them into a single container using `ffmpeg`.
- **Live Server Progress**
  Track the downloading, merging, and converting steps in real-time through the Next.js API polling status routes.

---

## 🎯 Core Features

✅ **Paste Public Link** — Supports YouTube, Instagram, TikTok, Twitter/X, and more  
✅ **Media Inspector** — Scans links and displays structured resolution and container options  
✅ **HD Video Merge** — Combines high-resolution adaptive video with best audio  
✅ **Audio Extraction** — Automatically extracts original audio or converts it to MP3  
✅ **Real-Time Progress** — Track backend download and merge percentages in the UI  
✅ **Direct Browser Save** — Files are transferred directly to your browser download list  
✅ **Bulletproof Safeguards** — Concurrency queue, rate limiting, and memory optimizations built-in  
✅ **SEO Optimized** — Built-in metadata, manifest, robots.txt, and sitemaps  
✅ **Custom Brand Identity** — Custom favicon, apple-touch-icons, and logos  
✅ **Vercel Analytics** — Production traffic and page view tracking integrated  

---

## 🛡️ Bulletproof Free-Tier Safeguards

To prevent Out-Of-Memory (OOM) crashes, CPU locks, and resource abuse on the free Hugging Face container backend, we implemented a custom zero-cost resilience architecture:

- **Centralized Concurrency Queue (`lib/JobQueue.js`)**: Restricts background video downloads and merges to a strict concurrency limit of **3** concurrent tasks. Extra incoming requests are held in a queue, returning their exact position in line via `/api/media/status`.
- **IP-Based Sliding-Window Rate Limiter (`lib/RateLimiter.js`)**: Restricts clients to a maximum of **5** downloads per hour, checking headers like `x-forwarded-for`/`x-real-ip` with fallback URL parameters for client resolution.
- **Flat-Memory Web Stream Pipelines (`app/api/media/download/route.js`)**: Streams files to browsers using Node.js `stream.Readable.toWeb` instead of buffering files in memory, respecting backpressure and ensuring memory usage remains flat.
- **Automated Garbage Collection**: A background scanner inside the job queue running every 10 minutes sweeps the temp storage directories and purges disk files, folders, and in-memory tracker maps older than 30 minutes.
- **Hard Duration Caps**: Inspect and download API routes automatically block links pointing to media exceeding **30 minutes** (1,800 seconds).

---

## 📁 Project Structure

```bash
fetch-by-the-atom/
├── app/
│   ├── api/
│   │   └── media/
│   │       ├── inspect/                    # Inspect source URL formats
│   │       ├── download/                   # Request a download/merge job
│   │       └── status/                     # Polling endpoint for job status
│   ├── dashboard/                          # Main link inspector UI
│   ├── settings/                           # Settings configuration panel
│   ├── layout.js                           # App shell layout + SEO metadata
│   ├── manifest.js                         # Web manifest definition
│   ├── robots.js                           # Robots.txt generator
│   └── sitemap.js                          # Sitemap generator
│
├── components/
│   ├── providers/
│   │   └── ToastProvider.js                # Toast notification system
│   ├── AppShell.js                         # Layout framing with responsive navigation
│   ├── Topbar.js                           # Clean header banner
│   ├── Sidebar.js                          # Drawer navigation bar
│   ├── GlassCard.js                        # Reusable glassmorphic container
│   ├── LinkInspector.js                    # URL submission form
│   ├── FormatCard.js                       # Render format list options
│   └── SmoothScrollProvider.js             # Lenis scroll configuration
│
├── public/
│   └── Logo.png                            # Project branding asset
│
├── utils/
│   ├── helpers.js                          # Formatting, validator, and URL parsers
│   └── server/
│       └── ytDlp.js                        # Server-side wrapper for yt-dlp and ffmpeg
│
├── Dockerfile                              # Multi-stage Docker config for HF Spaces
├── next.config.mjs                         # Next.js bundler and API config
├── package.json                            # Package dependencies
└── README.md                               # Project documentation
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18+ recommended)
- **Python 3** (required by yt-dlp)
- **yt-dlp** and **FFmpeg** binaries installed and added to the system PATH.

### 1. Clone the Repository

```bash
git clone https://github.com/zakisheriff/Downloader-by-The-Atom.git
cd Downloader-by-The-Atom
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure the Environment

Create a `.env.local` file to point to your backend API or local binaries (if they are not in the system path):

```env
# URL of your backend (leave empty if using the same server)
NEXT_PUBLIC_API_URL=

# Path to the local yt-dlp executable (optional)
YT_DLP_BIN=/usr/local/bin/yt-dlp
```

### 4. Run the Development Server

```bash
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## 🌐 Deployment Notes

To deploy the app for 100% free with no credit cards required, you can use a decoupled architecture:

### 1. Frontend (Static App)
Deploy the Next.js frontend to **Vercel** mapped to your custom domain (e.g., `downloader.theatom.lk`). Set the environment variable:
```env
NEXT_PUBLIC_API_URL=https://<your-huggingface-space-name>.hf.space
```

### 2. Backend (API Server)
Deploy the Next.js app inside a Docker container on a **Hugging Face Space**.
- **SDK**: Docker
- **Hardware**: Basic CPU (2 vCPU, 16 GB RAM) - 100% Free
- **Port**: `7860` (defined in the Dockerfile)

---

## 📡 API Overview

### Inspect Link
- `GET /api/media/inspect?url=<source_url>`
  Scans the URL and returns available video/audio options.

### Download Link
- `POST /api/media/download`
  Submits a download/merge request.
  **Body**:
  ```json
  {
    "url": "https://www.youtube.com/watch?v=...",
    "formatId": "video:137:merge",
    "selector": "137+bestaudio/best",
    "mode": "merge",
    "ext": "mp4"
  }
  ```
  **Response**:
  ```json
  { "id": "job_1716301294123" }
  ```

### Job Status
- `GET /api/media/status?id=<job_id>`
  Checks download status or downloads the completed file when finished.

---

## ⚠️ Usage & License

This project is licensed under the MIT License.

*Disclaimer: Downloader by The Atom should only be used to download media for which you have explicit permission or copyright ownership. The authors are not responsible for any misuse of this tool.*

---

<p align="center">
Made by <strong>Zaki Sheriff</strong>
</p>

<p align="center">
<em>Built to make media downloading simpler, cleaner, and fully free.</em>
</p>
