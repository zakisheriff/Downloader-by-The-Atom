FROM node:18-alpine

# Install system dependencies (Python3, FFmpeg, Curl, build utilities)
RUN apk add --no-cache python3 ffmpeg curl build-base

# Create a virtual environment for yt-dlp to avoid PEP 668 restrictions and install yt-dlp
RUN python3 -m venv /usr/local/yt-dlp-venv && \
    /usr/local/yt-dlp-venv/bin/pip install --no-cache-dir -U yt-dlp && \
    ln -s /usr/local/yt-dlp-venv/bin/yt-dlp /usr/local/bin/yt-dlp

# Set working directory
WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install npm dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=7860
ENV YT_DLP_BIN=/usr/local/bin/yt-dlp
ENV ALLOW_YOUTUBE_ADAPTIVE=true

# Build Next.js
RUN npm run build

# Expose port
EXPOSE 7860

# Start server
CMD ["npm", "start"]
