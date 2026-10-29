FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends chromium ffmpeg fonts-noto-core ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
RUN mkdir -p /app/data && chown -R node:node /app
USER node
ENV NODE_ENV=production CHROME_PATH=/usr/bin/chromium DATA_DIR=/app/data
EXPOSE 3000
CMD ["npm","start"]
