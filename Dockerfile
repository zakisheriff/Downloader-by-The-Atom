FROM node:20-bookworm-slim

# Install system dependencies (Python3, FFmpeg, Curl, Git, build tools).
# Debian (glibc) is required here rather than Alpine: the bgutil PO-token provider's
# "canvas" dependency only ships prebuilt binaries for glibc Linux. On musl/Alpine it
# has to compile from source, which is fragile and needs a long list of Cairo/Pango libs.
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 python3-venv python3-pip ffmpeg curl git build-essential ca-certificates unzip && \
    rm -rf /var/lib/apt/lists/*

# Create a virtual environment for yt-dlp to avoid PEP 668 restrictions and install yt-dlp
# plus the bgutil PO-token provider plugin (needed below to bypass YouTube's bot check).
# curl_cffi gives yt-dlp browser-TLS impersonation: from datacenter IPs (HF/Vercel) YouTube
# drops the plain Python TLS handshake with "TLS/SSL connection has been closed (EOF)" before
# any HTTP response. Impersonating Chrome's TLS fingerprint makes YouTube accept the connection.
RUN python3 -m venv /usr/local/yt-dlp-venv && \
    /usr/local/yt-dlp-venv/bin/pip install --no-cache-dir -U "yt-dlp[default]" "bgutil-ytdlp-pot-provider" "curl_cffi" && \
    ln -s /usr/local/yt-dlp-venv/bin/yt-dlp /usr/local/bin/yt-dlp

# Remove the bgutil SCRIPT-based PO-token provider, keeping only the HTTP one (we run the
# bgutil HTTP server in docker-entrypoint.sh). The script provider re-downloads its entire
# npm dependency tree through Deno on use, adding huge latency. Deno itself stays installed
# below and is still used for yt-dlp's JS challenge solver (a separate component, yt_dlp_ejs).
RUN find /usr/local/yt-dlp-venv -path '*yt_dlp_plugins*' -iname '*bgutil*script*' -delete || true

# Datacenter IPs (Hugging Face/Vercel) get blocked by YouTube with "Sign in to confirm
# you're not a bot", even though the same code works fine from a residential IP (localhost).
# The bgutil PO-token provider generates proof-of-origin tokens so yt-dlp's requests look
# legitimate again. yt-dlp auto-detects the script at ~/bgutil-ytdlp-pot-provider — no
# extra CLI flags needed.
RUN git clone --depth 1 https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git /root/bgutil-ytdlp-pot-provider && \
    cd /root/bgutil-ytdlp-pot-provider/server && \
    npm ci && \
    npx tsc

# Install Deno as the JS runtime for yt-dlp's signature / n-challenge solver. YouTube requires
# solving a JavaScript challenge to unlock the real video format URLs; Node 20 is flagged
# "unsupported" by yt-dlp's EJS solver, so without Deno every format URL gets stripped and only
# images remain ("Requested format is not available"). Deno is yt-dlp's recommended runtime.
RUN curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh

# Set working directory
WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install npm dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

RUN chmod +x docker-entrypoint.sh

# Set environment variables
ENV NODE_ENV=production
ENV PORT=7860
ENV YT_DLP_BIN=/usr/local/bin/yt-dlp
ENV ALLOW_YOUTUBE_ADAPTIVE=true

# Build Next.js
RUN npm run build

# Expose port
EXPOSE 7860

# Start server (also launches the bgutil PO-token provider in the background — see script)
CMD ["./docker-entrypoint.sh"]
