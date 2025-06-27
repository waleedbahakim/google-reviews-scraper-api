import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import scrapeReviews from '../scraper/scrapeReviews.js';
import cache from '../cache/memoryCache.js';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Simple logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} | ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/reviews', async (req, res) => {
  try {
    const { place_id, force } = req.query;
    const forceRefresh = force === 'true';
    
    if (!place_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: place_id'
      });
    }
    
    if (!/^(ChIJ|0x)[A-Za-z0-9_-]{10,40}$/.test(place_id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid place_id format'
      });
    }
    
    const cacheKey = `reviews_${place_id}`;
    if (!forceRefresh && cache.has(cacheKey)) {
      console.log(`Serving cached results for place_id: ${place_id}`);
      return res.json({
        ...cache.get(cacheKey),
        cached: true
      });
    }
    
    console.log(`Scraping new data for place_id: ${place_id}`);
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('Scraping took too long to complete'));
      }, 300000); // 5 minutes timeout
    });
    
    try {
      const reviewsData = await Promise.race([
        scrapeReviews(place_id),
        timeoutPromise
      ]);
      clearTimeout(timeoutId);
      
      if (reviewsData.success && reviewsData.reviews && reviewsData.reviews.length > 0) {
        cache.set(cacheKey, reviewsData);
      }
      
      return res.json({
        ...reviewsData,
        cached: false
      });
    } catch (scrapeError) {
      clearTimeout(timeoutId);
      if (scrapeError.message === 'Scraping took too long to complete') {
        return res.status(504).json({
          success: false,
          error: scrapeError.message,
          place_id: place_id
        });
      }
      
      throw scrapeError;
    }
  } catch (error) {
    console.error('Error in /reviews endpoint:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});


app.post('/cache/clear', (req, res) => {
  cache.clear();
  res.json({
    success: true,
    message: 'Cache cleared'
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found'
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    error: err.message
  });
});

// Start server
app.listen(port, () => {
  console.log(`Google Reviews Scraper API running on port ${port}`);
  console.log(`- Health check: http://localhost:${port}/health`);
  console.log(`- Example API usage: http://localhost:${port}/reviews?place_id=YOUR_PLACE_ID`);
}); 