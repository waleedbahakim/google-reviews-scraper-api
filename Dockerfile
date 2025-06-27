FROM node:20-slim

# Install only essential system dependencies and Chrome
RUN apt-get update && apt-get install -y \
    wget gnupg curl ca-certificates \
    fonts-noto fonts-freefont-ttf libxss1 libatk-bridge2.0-0 \
    libgtk-3-0 libdrm-dev libnss3 libx11-xcb1 libasound2 \
    libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
    --no-install-recommends && \
    wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google.gpg && \
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google.list && \
    apt-get update && apt-get install -y google-chrome-stable && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install only prod dependencies early to cache Docker layer
COPY package.json package-lock.json ./
RUN npm install --omit=dev


# Copy app code after dependencies are installed
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

ARG SCRAPER_API_KEY
ENV SCRAPER_API_KEY=$SCRAPER_API_KEY

# Health check for Railway
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000

CMD ["node", "api/server.js"]
