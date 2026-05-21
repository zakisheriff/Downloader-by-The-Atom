---
title: Downloader Backend
emoji: 📥
colorFrom: purple
colorTo: blue
sdk: docker
app_port: 7860
---

# Downloader by The Atom

Downloader by The Atom is a clean Next.js media downloader for public links. Paste a YouTube, Instagram, TikTok, X, or other supported source URL, inspect the available formats, and save the file directly from the browser.

## Run locally

```bash
npm install
npm run dev
```

## Production requirements

- A persistent Node host or VPS
- `yt-dlp` installed on the server
- `ffmpeg` installed on the server

Optional environment variable:

```env
YT_DLP_BIN=yt-dlp
```
