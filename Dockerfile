FROM node:20-slim

RUN apt-get update \
  && apt-get install -y \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-khmeros fonts-kacst fonts-freefont-ttf \
    libxss1 libatk-bridge2.0-0 libgtk-3-0 libdrm-dev libnss3 libx11-xcb1 libasound2 libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
    --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

ENV NODE_ENV=production

ARG SCRAPER_API_KEY
ENV SCRAPER_API_KEY=$SCRAPER_API_KEY

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000
CMD ["node", "api/server.js"]
