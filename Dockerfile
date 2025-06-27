FROM node:20-slim

# Install Chrome and required libraries
RUN apt-get update \
  && apt-get install -y wget gnupg curl \
  && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
  && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] https://dl-ssl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
  && apt-get update \
  && apt-get install -y \
    google-chrome-stable \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-khmeros fonts-kacst fonts-freefont-ttf \
    libxss1 libatk-bridge2.0-0 libgtk-3-0 libdrm-dev libnss3 libx11-xcb1 libasound2 libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
    --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

# Set workdir and copy files
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Environment setup
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome

# Build-time ScraperAPI key
ARG SCRAPER_API_KEY
ENV SCRAPER_API_KEY=$SCRAPER_API_KEY

# Healthcheck (optional)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD curl -f http://localhost:3000/health || exit 1

# Expose port and run app
EXPOSE 3000
CMD ["node", "api/server.js"]
