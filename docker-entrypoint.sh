#!/bin/sh
set -e

# Start the bgutil PO-token provider's local server in the background. yt-dlp's PO-token
# plugin queries it on 127.0.0.1:4416 to fetch proof-of-origin tokens before talking to
# YouTube. Without this running, every YouTube request hangs waiting for a token that
# never arrives, until our own exec timeout kills it.
node /root/bgutil-ytdlp-pot-provider/server/build/main.js &

exec npm start
