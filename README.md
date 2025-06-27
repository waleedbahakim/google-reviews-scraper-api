# Google Reviews Scraper API
http://localhost:3000/reviews?place_id=ChIJPTacEpBQwokRKwIlDXelxkA

A Node.js API for scraping Google Maps reviews with advanced stealth features, proxy rotation, and caching.

## Features

- 🔍 Scrapes complete Google Maps reviews for any place using Puppeteer with Stealth Plugin
- 🆔 Supports both standard (`ChIJ...`) and raw internal (`0x...`) Google Maps place IDs
- ⚙️ Sorts reviews by newest first with customizable scroll depth
- 🧠 Intelligent memory cache with customizable TTL (skipped when `force=true` is passed)
- 🕵️ Comprehensive anti-bot detection measures
- 🔄 Random delays, user agent rotation, and browser fingerprint randomization
- 🛡️ Uses ScraperAPI for reliable proxy rotation and CAPTCHA handling
- 🐳 Containerized with Docker for easy deployment
- 🚀 Deployment guides for Railway and Fly.io

## Tech Stack

- Express.js API
- Puppeteer with Stealth Plugin for web scraping
- ScraperAPI for proxy management and CAPTCHA bypass
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

3. Create a `.env` file in the root directory (or copy from `.env.example`):
```
PORT=3000                 # Port to run the API server
SCRAPER_API_KEY=your_key  # Your ScraperAPI key for proxy rotation
CACHE_TTL=1800            # Cache time-to-live in seconds (30 minutes)
NODE_ENV=production       # Environment setting
DEBUG_PUPPETEER=false     # Whether to show browser for debugging
MAX_RETRIES=3             # Maximum retry attempts for failed scrapes
MAX_SCROLL_ATTEMPTS=10    # Maximum scroll attempts to load reviews
SCROLL_DELAY=1000         # Delay between scrolls in milliseconds
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
- `place_id` - Required. The Google Maps Place ID (supports both `ChIJ...` and `0x...` formats)
- `force` - Optional. Set to "true" to bypass the cache and force a new scrape

**Example with standard place ID:**
```bash
curl "http://localhost:3000/reviews?place_id=ChIJN1t_tDeuEmsRUsoyG83frY4"
```

**Example with raw place ID:**
```bash
curl "http://localhost:3000/reviews?place_id=0x808f8555b137a6f1:0x18cdd09a30b1c8b7"
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
      "profile_photo": "https://example.com/photo.jpg",
      "rating": 5,
      "relative_date": "2 days ago",
      "date": "2023-06-12T12:00:00Z",
      "review_text": "Great experience with this business!",
      "review_id": "ChdDSUhNMG9nS0VJQ0FnSUNleF9lSGtnRRAB"
    },
    // ... more reviews
  ]
}
```

## Anti-Bot Techniques Implemented

This scraper uses multiple techniques to avoid detection:

- **Puppeteer-Extra with Stealth Plugin** - Hides automation flags and fingerprinting indicators
- **Randomized User Agents** - Rotates between common desktop and mobile browsers
- **Delayed Interactions** - Uses random timing between clicks, scrolls, and page interactions
- **Mouse Movement Simulation** - Mimics natural mouse movement patterns
- **ScraperAPI Proxy Rotation** - Changes IP addresses to avoid rate limiting
- **Browser Fingerprint Randomization** - Alters Canvas, WebGL, and other fingerprinting factors
- **Request Header Normalization** - Matches headers to the simulated browser
- **Automated CAPTCHA Handling** - Via ScraperAPI's CAPTCHA solving capabilities

## Known Limitations

- **Scraping Time**: The scraping process can take 30-120 seconds depending on the number of reviews
- **Partial Reviews**: For locations with thousands of reviews, only the first 100-200 may be captured due to Google's dynamic loading
- **Review Sorting**: Currently only supports sorting by "newest" reviews
- **Language Support**: Best results with English-language Google locations
- **Rate Limiting**: Heavy usage may still trigger temporary blocks even with proxies
- **Review Details**: Some review metadata (like specific reactions) may not be captured
- **Photo Reviews**: Limited support for extracting photos from reviews

## Example Usage with Popular Place IDs

Try these popular place IDs for testing:

- The Empire State Building: `ChIJaXQRs6lZwokRY6EFpJnhNNE`
- Eiffel Tower: `ChIJLU7jZClu5kcR4PcOOO6p3I0`
- Sydney Opera House: `ChIJ3S-JXmauEmsRUcIaWtf4MzE`
- Taj Mahal: `ChIJbf9C6zFxdDkR9V8jVm5PCDE`
- Statue of Liberty: `ChIJPTacEpBQwokRKwIlDXelxkA`

## Cloud Deployment

### Deploying to Railway

1. Sign up for [Railway](https://railway.app/)
2. Connect your GitHub repository
3. Set up the required environment variables in Railway dashboard
4. Deploy using the following commands:

```bash
npm install -g @railway/cli
railway login
railway link
railway up
```

### Deploying to Fly.io

1. Install the Fly CLI:
```bash
curl -L https://fly.io/install.sh | sh
```

2. Sign up and log in:
```bash
fly auth signup
fly auth login
```

3. Launch your app:
```bash
fly launch
```

4. Set environment variables:
```bash
fly secrets set SCRAPER_API_KEY=your_key
fly secrets set CACHE_TTL=1800
# Set other required environment variables
```

5. Deploy:
```bash
fly deploy
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Port number for the API server | `3000` |
| `SCRAPER_API_KEY` | Your ScraperAPI key for proxy rotation | Required |
| `CACHE_TTL` | Cache time-to-live in seconds | `1800` (30 minutes) |
| `NODE_ENV` | Environment setting | `production` |
| `DEBUG_PUPPETEER` | Show browser for debugging | `false` |
| `MAX_RETRIES` | Maximum retry attempts for failed scrapes | `3` |
| `MAX_SCROLL_ATTEMPTS` | Maximum scroll attempts to load reviews | `10` |
| `SCROLL_DELAY` | Delay between scrolls in milliseconds | `1000` |

## Example Files

### .env.example
```
PORT=3000
SCRAPER_API_KEY=your_api_key_here
CACHE_TTL=1800
NODE_ENV=production
DEBUG_PUPPETEER=false
MAX_RETRIES=3
MAX_SCROLL_ATTEMPTS=10
SCROLL_DELAY=1000
```

### .dockerignore
```
node_modules
npm-debug.log
.env
.git
.github
.gitignore
README.md
.DS_Store
output
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

## Legal Disclaimer

**Important Notice:** This scraper is provided for educational and research purposes only. Web scraping may violate the Terms of Service of Google Maps, and using this tool could potentially violate these terms.

Users of this tool should:
- Review and comply with Google's Terms of Service
- Use the tool responsibly with reasonable request rates
- Consider legal alternatives like the official Google Places API
- Understand that Google may take measures to block scraping activities
- Be aware that commercial use of scraped data may have additional legal implications

The developers of this tool accept no liability for misuse or any consequences arising from the use of this software. Use at your own risk and responsibility.

## License

MIT 