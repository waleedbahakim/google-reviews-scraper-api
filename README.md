# Google Reviews Scraper API

A Node.js API for scraping Google Maps reviews with caching and stealth features.

## Features

- 🔍 Scrapes Google Maps reviews for any place by place_id
- ⚙️ Sorts by newest reviews
- 🧠 Intelligent memory cache with customizable TTL
- 🕵️ Stealth features to avoid detection
- 🔄 Random delays and user agent rotation
- 🛡️ Uses ScraperAPI for reliable proxy rotation and CAPTCHA handling
- 🐳 Containerized with Docker for easy deployment

## Tech Stack

- Express.js API
- Puppeteer for web scraping
- ScraperAPI for proxy management
- In-memory caching
- Docker support

## Getting Started

### Prerequisites

- Node.js 16+ installed
- ScraperAPI account (get one at [scraperapi.com](https://www.scraperapi.com/))
- Docker (optional, for containerized setup)

### ScraperAPI Setup

1. Sign up for a ScraperAPI account at [scraperapi.com](https://www.scraperapi.com/)
2. Copy your API key from the dashboard
3. Add the API key to your `.env` file as `SCRAPER_API_KEY`

### Local Setup

1. Clone the repository
```bash
git clone https://github.com/yourusername/google-reviews-scraper-api.git
cd google-reviews-scraper-api
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file in the root directory:
```
PORT=3000
SCRAPER_API_KEY=your_api_key_here
CACHE_TTL=1800
NODE_ENV=production
DEBUG_PUPPETEER=false
MAX_RETRIES=3
```

4. Run the application in development mode
```bash
npm run dev
```

5. The API will be available at `http://localhost:3000`

### Docker Setup

1. Build the Docker image
```bash
docker build -t google-reviews-scraper .
```

2. Run the container
```bash
docker run -p 3000:3000 --env-file .env google-reviews-scraper
```

## API Endpoints

### GET /reviews

Fetches reviews for a Google Maps place.

**Query Parameters:**
- `place_id` - Required. The Google Maps Place ID
- `force` - Optional. Set to "true" to bypass the cache and force a new scrape

**Example:**
```bash
curl "http://localhost:3000/reviews?place_id=ChIJN1t_tDeuEmsRUsoyG83frY4"
```

**Example with force refresh:**
```bash
curl "http://localhost:3000/reviews?place_id=ChIJN1t_tDeuEmsRUsoyG83frY4&force=true"
```

### GET /health

Health check endpoint.

```bash
curl http://localhost:3000/health
```

### GET /cache/stats

View cache statistics (for debugging).

```bash
curl http://localhost:3000/cache/stats
```

### POST /cache/clear

Clear the entire cache.

```bash
curl -X POST http://localhost:3000/cache/clear
```

## Response Format

```json
{
  "success": true,
  "place_id": "ChIJN1t_tDeuEmsRUsoyG83frY4",
  "place_name": "Example Business",
  "review_count": 10,
  "scrape_date": "2023-06-14T12:00:00Z",
  "cached": false,
  "reviews": [
    {
      "reviewer_name": "John Smith",
      "rating": 5,
      "relative_date": "2 days ago",
      "date": "2023-06-12T12:00:00Z",
      "review_text": "Great experience with this business!"
    },
    // ... more reviews
  ]
}
```

## Proxy Configuration

This API uses ScraperAPI as a proxy service to avoid IP blocks and CAPTCHAs when scraping Google Maps. The implementation:

- Uses ScraperAPI's direct URL API: `http://api.scraperapi.com/?api_key=YOUR_API_KEY&url=TARGET_URL&render=true`
- Enables JavaScript rendering with the `render=true` parameter
- Automatically handles proxy rotation and CAPTCHA solving

ScraperAPI offers:
- Rotating residential and datacenter proxies
- Automatic CAPTCHA solving
- Automatic retries
- Geolocation targeting

You'll need a ScraperAPI account to use this application effectively in production. Their free tier offers 1,000 API calls per month, which is sufficient for development and testing purposes. Check [their pricing page](https://www.scraperapi.com/pricing) for more details.

## Responsible Scraping Notes

- This tool is intended for educational purposes and responsible data gathering
- Respect Google's Terms of Service
- Implement reasonable delays between requests
- Consider upgrading your ScraperAPI plan for larger-scale scraping
- Do not use this tool to scrape large volumes of data

## License

MIT 