import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { format, parse, subDays, subWeeks, subMonths, subYears } from 'date-fns';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

// Load environment variables
dotenv.config();

// Apply stealth plugin
puppeteer.use(StealthPlugin());

// Configuration
const CONFIG = {
  DEBUG: process.env.DEBUG_PUPPETEER === 'true',
  MAX_RETRIES: parseInt(process.env.MAX_RETRIES || '3', 10),
  TIMEOUT: parseInt(process.env.TIMEOUT || '60000', 10),
  DELAY_MIN: parseInt(process.env.DELAY_MIN || '1000', 10),
  DELAY_MAX: parseInt(process.env.DELAY_MAX || '3000', 10),
  MAX_REVIEWS: parseInt(process.env.MAX_REVIEWS || '100', 10),
  SCRAPER_API_KEY: process.env.SCRAPER_API_KEY,
  OUTPUT_DIR: process.env.OUTPUT_DIR || './output',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};

// User agents for rotation
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

// Logging utility
class Logger {
  constructor(level = 'info') {
    this.levels = { error: 0, warn: 1, info: 2, debug: 3 };
    this.level = this.levels[level] || 2;
  }

  log(level, message, data = null) {
    if (this.levels[level] <= this.level) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
      console.log(logMessage);
      if (data && this.level >= 3) {
        console.log(JSON.stringify(data, null, 2));
      }
    }
  }

  error(message, data) { this.log('error', message, data); }
  warn(message, data) { this.log('warn', message, data); }
  info(message, data) { this.log('info', message, data); }
  debug(message, data) { this.log('debug', message, data); }
}

const logger = new Logger(CONFIG.LOG_LEVEL);

// Utility functions
class Utils {
  static getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  static randomDelay(min = CONFIG.DELAY_MIN, max = CONFIG.DELAY_MAX) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  static convertRelativeDateToISO(relativeDate) {
    const now = new Date();
    
    if (!relativeDate || typeof relativeDate !== 'string') {
      return format(now, "yyyy-MM-dd'T'HH:mm:ss'Z'");
    }

    const lowerDate = relativeDate.toLowerCase();
    
    // Handle specific patterns
    if (lowerDate.includes('minute') || lowerDate.includes('hour')) {
      return format(now, "yyyy-MM-dd'T'HH:mm:ss'Z'");
    }

    // Handle "a day ago" and similar formats
    if (lowerDate === 'a day ago' || lowerDate === 'yesterday') {
      return format(subDays(now, 1), "yyyy-MM-dd'T'HH:mm:ss'Z'");
    }

    if (lowerDate === 'a week ago') {
      return format(subWeeks(now, 1), "yyyy-MM-dd'T'HH:mm:ss'Z'");
    }

    if (lowerDate === 'a month ago') {
      return format(subMonths(now, 1), "yyyy-MM-dd'T'HH:mm:ss'Z'");
    }

    if (lowerDate === 'a year ago') {
      return format(subYears(now, 1), "yyyy-MM-dd'T'HH:mm:ss'Z'");
    }
    
    // Handle "edited" prefix
    let cleanDate = lowerDate;
    if (lowerDate.startsWith('edited ')) {
      cleanDate = lowerDate.substring(7);
    }
    
    // Handle numeric patterns (e.g., "2 days ago")
    const dayMatch = cleanDate.match(/(\d+)\s*days?\s*ago/);
    if (dayMatch) {
      const days = parseInt(dayMatch[1]);
      return format(subDays(now, days), "yyyy-MM-dd'T'HH:mm:ss'Z'");
    }
    
    const weekMatch = cleanDate.match(/(\d+)\s*weeks?\s*ago/);
    if (weekMatch) {
      const weeks = parseInt(weekMatch[1]);
      return format(subWeeks(now, weeks), "yyyy-MM-dd'T'HH:mm:ss'Z'");
    }
    
    const monthMatch = cleanDate.match(/(\d+)\s*months?\s*ago/);
    if (monthMatch) {
      const months = parseInt(monthMatch[1]);
      return format(subMonths(now, months), "yyyy-MM-dd'T'HH:mm:ss'Z'");
    }
    
    const yearMatch = cleanDate.match(/(\d+)\s*years?\s*ago/);
    if (yearMatch) {
      const years = parseInt(yearMatch[1]);
      return format(subYears(now, years), "yyyy-MM-dd'T'HH:mm:ss'Z'");
    }
    
    // Try parsing specific date formats
    const datePatterns = [
      'MMMM yyyy', 'MMM yyyy', 'MM/dd/yyyy', 'dd/MM/yyyy',
      'yyyy-MM-dd', 'MM-dd-yyyy', 'dd-MM-yyyy'
    ];
    
    for (const pattern of datePatterns) {
      try {
        const parsedDate = parse(relativeDate, pattern, new Date());
        if (!isNaN(parsedDate.getTime())) {
          return format(parsedDate, "yyyy-MM-dd'T'HH:mm:ss'Z'");
        }
      } catch (e) {
        continue;
      }
    }
    
    // If we reach here and the date is "Unknown date", return a placeholder date rather than the raw text
    if (relativeDate === "Unknown date") {
      return format(now, "yyyy-MM-dd'T'HH:mm:ss'Z'") + " (unknown original date)";
    }
    
    logger.warn(`Could not parse date: ${relativeDate}`);
    return relativeDate;
  }

  static extractStarRating(ariaLabel) {
    if (!ariaLabel) return null;
    const match = ariaLabel.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : null;
  }

  static cleanText(text) {
    if (!text) return '';
    return text.replace(/\s+/g, ' ').trim();
  }

  static async ensureDirectoryExists(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  static async saveDebugFile(filename, content, type = 'text') {
    if (!CONFIG.DEBUG) return;
    
    try {
      await Utils.ensureDirectoryExists(CONFIG.OUTPUT_DIR);
      const filepath = path.join(CONFIG.OUTPUT_DIR, filename);
      
      if (type === 'json') {
        await fs.writeFile(filepath, JSON.stringify(content, null, 2));
      } else {
        await fs.writeFile(filepath, content);
      }
      
      logger.debug(`Saved debug file: ${filepath}`);
    } catch (error) {
      logger.error(`Failed to save debug file: ${filename}`, error);
    }
  }
}

// Browser management
class BrowserManager {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async launch() {
    logger.info('Launching browser...');
    
    this.browser = await puppeteer.launch({
      headless: CONFIG.DEBUG ? false : 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-notifications',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-images',
        '--disable-javascript-harmony-shipping',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--window-size=1920,1080'
      ],
      timeout: CONFIG.TIMEOUT
    });

    this.page = await this.browser.newPage();
    
    // Set user agent
    await this.page.setUserAgent(Utils.getRandomItem(USER_AGENTS));
    
    // Set viewport
    await this.page.setViewport({ 
      width: 1920, 
      height: 1080, 
      deviceScaleFactor: 1 
    });
    
    // Set extra headers
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    });
    
    // Set default timeout
    this.page.setDefaultTimeout(CONFIG.TIMEOUT);
    
    // Block unnecessary resources
    await this.page.setRequestInterception(true);
    this.page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });
    
    logger.info('Browser launched successfully');
  }

  async navigateToPlace(placeId) {
    logger.info(`Navigating to place: ${placeId}`);
    
    const urls = [
      `https://www.google.com/maps/place/?q=place_id:${placeId}`,
      `https://maps.google.com/maps?q=place_id:${placeId}`,
      `https://www.google.com/maps/search/?api=1&query=place_id:${placeId}`
    ];

    for (const url of urls) {
      try {
        logger.debug(`Trying URL: ${url}`);
        
        await this.page.goto(url, { 
          waitUntil: ['networkidle2', 'domcontentloaded'], 
          timeout: CONFIG.TIMEOUT 
        });
        
        await Utils.randomDelay(2000, 4000);
        
        // Check if we're on the right page
        const currentUrl = this.page.url();
        if (currentUrl.includes('google.com/maps')) {
          logger.info('Successfully navigated to Google Maps');
          return true;
        }
        
      } catch (error) {
        logger.warn(`Failed to navigate with URL: ${url}`, error.message);
        continue;
      }
    }
    
    throw new Error('Failed to navigate to any Google Maps URL');
  }

  async takeScreenshot(filename) {
    if (!CONFIG.DEBUG) return;
    
    try {
      await Utils.ensureDirectoryExists(CONFIG.OUTPUT_DIR);
      const filepath = path.join(CONFIG.OUTPUT_DIR, filename);
      await this.page.screenshot({ path: filepath, fullPage: true });
      logger.debug(`Screenshot saved: ${filepath}`);
    } catch (error) {
      logger.error(`Failed to take screenshot: ${filename}`, error);
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      logger.info('Browser closed');
    }
  }
}

// Review extraction logic
class ReviewExtractor {
  constructor(page) {
    this.page = page;
  }

  async checkForCaptcha() {
    const hasCaptcha = await this.page.evaluate(() => {
      return !!document.querySelector('form[action*="captcha"]') || 
             document.body.textContent.includes('unusual traffic') ||
             document.body.textContent.includes('CAPTCHA') ||
             document.body.textContent.includes('verify you are human');
    });
    
    if (hasCaptcha) {
      throw new Error('CAPTCHA detected - scraping blocked');
    }
    
    return false;
  }

  async getPlaceName() {
    const selectors = [
      'h1[data-attrid="title"]',
      'h1.x3AX1-LfntMc-header-title-title',
      'h1.qrShPb',
      '[data-attrid="title"] span',
      '.x3AX1-LfntMc-header-title-title span',
      'h1 span',
      '.DUwDvf', // Common class for place name
      '.fontHeadlineLarge', // Another common class
      '.OVnw0d .fontHeadlineLarge' // Google Maps 2023+ place name
    ];

    for (const selector of selectors) {
      try {
        const element = await this.page.$(selector);
        if (element) {
          const name = await this.page.evaluate(el => el.textContent?.trim(), element);
          if (name && name.length > 0) {
            logger.info(`Found place name: ${name}`);
            return name;
          }
        }
      } catch (error) {
        continue;
      }
    }

    // Try to extract from the page title
    try {
      const pageTitle = await this.page.title();
      if (pageTitle && !pageTitle.includes('Google Maps')) {
        const nameFromTitle = pageTitle.split('-')[0].trim();
        if (nameFromTitle && nameFromTitle.length > 0) {
          logger.info(`Found place name from page title: ${nameFromTitle}`);
          return nameFromTitle;
        }
      }
    } catch (error) {
      logger.warn('Could not extract place name from page title', error);
    }
    
    logger.warn('Could not find place name');
    return 'Unknown Place';
  }

  async navigateToReviews() {
    logger.info('Navigating to reviews section...');
    
    // First try to find and click reviews tab
    const reviewsTabSelectors = [
      'button[data-tab-index="1"]',
      'button[jsaction*="pane.rating.moreReviews"]',
      'a[href*="reviews"]',
      'button[aria-label*="Review"]',
      'div[role="tab"]:nth-child(2)',
      'div[role="tab"]:nth-child(3)'
    ];

    let reviewsTabFound = false;
    
    for (const selector of reviewsTabSelectors) {
      try {
        const tabs = await this.page.$$(selector);
        
        for (const tab of tabs) {
          const tabText = await this.page.evaluate(el => el.textContent?.toLowerCase() || '', tab);
          
          if (tabText.includes('review') || tabText.includes('reviews')) {
            logger.info(`Found reviews tab: ${tabText}`);
            await tab.click();
            await Utils.randomDelay(2000, 4000);
            reviewsTabFound = true;
            break;
          }
        }
        
        if (reviewsTabFound) break;
        
      } catch (error) {
        continue;
      }
    }

    // If no specific reviews tab found, try to find review elements on current page
    if (!reviewsTabFound) {
      logger.info('No reviews tab found, checking if reviews are already visible...');
    }

    // Wait for reviews to load
    const reviewsWaitSelectors = [
      '[data-review-id]',
      '.jftiEf',
      '.MyEned',
      '.wiI7pd',
      '.fontBodyMedium',
      '.DU9Pgb'
    ];

    let reviewsLoaded = false;
    for (const selector of reviewsWaitSelectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: 10000 });
        reviewsLoaded = true;
        logger.info(`Reviews loaded (found: ${selector})`);
        break;
      } catch (error) {
        continue;
      }
    }

    if (!reviewsLoaded) {
      logger.warn('Could not confirm reviews are loaded');
    }

    return reviewsLoaded;
  }

  async sortReviewsByNewest() {
    logger.info('Attempting to sort reviews by newest...');
    
    try {
      // Look for sort button
      const sortSelectors = [
        'button[data-value="Sort"]',
        'button[jsaction*="sortBy"]',
        'button[aria-label*="Sort"]',
        '.kbBxb button',
        '.czM3lc button'
      ];

      let sortButtonFound = false;
      
      for (const selector of sortSelectors) {
        try {
          const sortButton = await this.page.$(selector);
          if (sortButton) {
            await sortButton.click();
            await Utils.randomDelay(1000, 2000);
            sortButtonFound = true;
            break;
          }
        } catch (error) {
          continue;
        }
      }

      if (sortButtonFound) {
        // Look for "Newest" option in dropdown
        const newestSelectors = [
          'div[role="menuitemradio"]:nth-child(2)',
          'div[data-index="1"]',
          'li[role="menuitemradio"]:nth-child(2)'
        ];

        for (const selector of newestSelectors) {
          try {
            const newestOption = await this.page.$(selector);
            if (newestOption) {
              await newestOption.click();
              await Utils.randomDelay(1000, 2000);
              logger.info('Successfully sorted by newest');
              return true;
            }
          } catch (error) {
            continue;
          }
        }
      }
      
      logger.info('Sort option not found, using default order');
      return false;
      
    } catch (error) {
      logger.warn('Error sorting reviews', error.message);
      return false;
    }
  }

  async scrollToLoadMoreReviews() {
    logger.info('Scrolling to load more reviews...');
    
    let previousReviewCount = 0;
    let unchangedScrolls = 0;
    const maxUnchangedScrolls = 5;  // Increase from 3 to 5 for more patience
    
    for (let i = 0; i < 15; i++) {  // Increase from 10 to 15 scrolls
      // Scroll in the reviews container
      await this.page.evaluate(() => {
        const containers = [
          document.querySelector('.m6QErb[data-tab-index="1"]'),
          document.querySelector('.m6QErb[data-tab-index="2"]'),
          document.querySelector('.section-scrollbox'),
          document.querySelector('.siAUzd-neVct'),
          document.querySelector('.review-dialog-list'),
          document.querySelector('.DxyBCb'),  // Added common review container
          document.documentElement
        ];
        
        const container = containers.find(c => c !== null);
        if (container) {
          container.scrollTo(0, container.scrollHeight);
        }
      });
      
      // Wait longer for reviews to load
      await Utils.randomDelay(2000, 4000);
      
      // Check if new reviews loaded
      const currentReviewCount = await this.page.evaluate(() => {
        const reviewSelectors = [
          '[data-review-id]',
          '.jftiEf',
          '.MyEned',
          '.wiI7pd',
          '.gws-localreviews__google-review'  // Added another common review class
        ];
        
        for (const selector of reviewSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            return elements.length;
          }
        }
        return 0;
      });
      
      logger.debug(`Reviews found after scroll ${i + 1}: ${currentReviewCount}`);
      
      if (currentReviewCount === previousReviewCount) {
        unchangedScrolls++;
        if (unchangedScrolls >= maxUnchangedScrolls) {
          logger.info('No new reviews loading after multiple attempts, stopping scroll');
          break;
        }
      } else {
        unchangedScrolls = 0;
      }
      
      previousReviewCount = currentReviewCount;
      
      // Stop if we've reached the desired number of reviews
      if (currentReviewCount >= CONFIG.MAX_REVIEWS) {
        logger.info(`Reached maximum reviews limit: ${CONFIG.MAX_REVIEWS}`);
        break;
      }
    }
    
    logger.info(`Finished scrolling. Total reviews visible: ${previousReviewCount}`);
  }

  async expandReviewTexts() {
    logger.info('Expanding truncated review texts...');
    
    const expandSelectors = [
      'button[jsaction*="review.expandReview"]',
      'button[aria-label*="more"]',
      'button[data-expandable-section]',
      '.review-more-link',
      '.wiI7pd button'
    ];

    let expandedCount = 0;
    
    for (const selector of expandSelectors) {
      try {
        const expandButtons = await this.page.$$(selector);
        
        for (const button of expandButtons) {
          try {
            await button.click();
            await Utils.randomDelay(200, 500);
            expandedCount++;
            
            // Limit expansion to avoid infinite loops
            if (expandedCount > 20) break;
            
          } catch (error) {
            continue;
          }
        }
        
        if (expandedCount > 0) {
          logger.info(`Expanded ${expandedCount} review texts`);
          break;
        }
        
      } catch (error) {
        continue;
      }
    }
  }

  async extractReviews() {
    logger.info('Extracting reviews from page...');
    
    await this.expandReviewTexts();
    
    const reviews = await this.page.evaluate(() => {
      const reviewElements = document.querySelectorAll([
        '[data-review-id]',
        '.jftiEf',
        '.MyEned',
        '.review-item',
        '.section-review'
      ].join(', '));
      
      const cleanText = (text) => text ? text.replace(/\s+/g, ' ').trim() : '';
      
      const extractedReviews = [];
      const reviewerIds = new Set(); // Track unique reviewers
      
      for (const reviewEl of reviewElements) {
        try {
          // Extract reviewer name
          const nameSelectors = [
            '.d4r55',
            '.TSUbDb',
            '.WNxzHc',
            '.fontBodyMedium:first-child',
            '.review-author-name'
          ];
          
          let reviewerName = '';
          for (const selector of nameSelectors) {
            const nameEl = reviewEl.querySelector(selector);
            if (nameEl && nameEl.textContent) {
              reviewerName = cleanText(nameEl.textContent);
              break;
            }
          }
          
          if (!reviewerName) {
            reviewerName = 'Anonymous';
          }
          
          // Extract rating
          const ratingSelectors = [
            'span[role="img"][aria-label*="star"]',
            '.kvMYJc',
            '.Fam1ne',
            '.review-rating'
          ];
          
          let rating = null;
          for (const selector of ratingSelectors) {
            const ratingEl = reviewEl.querySelector(selector);
            if (ratingEl) {
              const ariaLabel = ratingEl.getAttribute('aria-label');
              if (ariaLabel) {
                const match = ariaLabel.match(/(\d+(?:\.\d+)?)/);
                if (match) {
                  rating = parseFloat(match[1]);
                  break;
                }
              }
            }
          }
          
          // Try another approach for ratings
          if (rating === null) {
            const ratingStarsEl = reviewEl.querySelector('.QJAzGd');
            if (ratingStarsEl) {
              const style = ratingStarsEl.getAttribute('style');
              if (style && style.includes('width:')) {
                const widthMatch = style.match(/width:\s*(\d+)%/);
                if (widthMatch) {
                  const percent = parseInt(widthMatch[1]);
                  rating = Math.round((percent / 20) * 10) / 10; // Convert percent to 5-star scale
                }
              }
            }
          }
          
          // Extract date
          const dateSelectors = [
            '.rsqaWe',
            '.DU9Pgb',
            '.dehysf',
            '.review-publish-date'
          ];
          
          let relativeDate = '';
          for (const selector of dateSelectors) {
            const dateEl = reviewEl.querySelector(selector);
            if (dateEl && dateEl.textContent) {
              relativeDate = cleanText(dateEl.textContent);
              break;
            }
          }
          
          if (!relativeDate) {
            relativeDate = 'Unknown date';
          }
          
          // Extract review text
          const textSelectors = [
            '.wiI7pd',
            '.MyEned',
            '.fontBodyMedium span',
            '.review-full-text',
            '.section-review-text'
          ];
          
          let reviewText = '';
          for (const selector of textSelectors) {
            const textEl = reviewEl.querySelector(selector);
            if (textEl && textEl.textContent) {
              reviewText = cleanText(textEl.textContent);
              if (reviewText.length > 10) break; // Prefer longer text
            }
          }
          
          // Filter out Google translation notes
          if (reviewText.includes('Translated by Google') && reviewText.length < 30) {
            continue;
          }
          
          // Create a unique identifier for this review
          const reviewId = `${reviewerName}|${rating}|${reviewText.substring(0, 30)}`;
          
          // Only add review if not a duplicate and has meaningful data
          if (!reviewerIds.has(reviewId) && (reviewText.length > 0 || rating !== null)) {
            reviewerIds.add(reviewId);
            extractedReviews.push({
              reviewer_name: reviewerName,
              rating: rating,
              relative_date: relativeDate,
              review_text: reviewText,
              extracted_at: new Date().toISOString()
            });
          }
          
        } catch (error) {
          console.log('Error extracting individual review:', error);
          continue;
        }
      }
      
      return extractedReviews;
    });
    
    logger.info(`Extracted ${reviews.length} reviews`);
    
    // Convert relative dates to ISO format
    const reviewsWithFormattedDates = reviews.map(review => ({
      ...review,
      date: Utils.convertRelativeDateToISO(review.relative_date)
    }));
    
    return reviewsWithFormattedDates;
  }
}

// Main scraper class
class GoogleMapsReviewScraper {
  constructor() {
    this.browserManager = new BrowserManager();
  }

  async scrapeReviews(placeId, retryCount = 0) {
    if (!placeId || typeof placeId !== 'string') {
      throw new Error('Invalid place_id provided');
    }

    logger.info(`Starting scrape for place_id: ${placeId}${retryCount > 0 ? ` (retry ${retryCount})` : ''}`);

    try {
      // Launch browser
      await this.browserManager.launch();
      
      // Check for CAPTCHA early
      const reviewExtractor = new ReviewExtractor(this.browserManager.page);
      await reviewExtractor.checkForCaptcha();
      
      // Navigate to place
      await this.browserManager.navigateToPlace(placeId);
      await this.browserManager.takeScreenshot(`navigation_${placeId}_${Date.now()}.png`);
      
      // Get place name
      const placeName = await reviewExtractor.getPlaceName();
      
      // Navigate to reviews
      await reviewExtractor.navigateToReviews();
      await this.browserManager.takeScreenshot(`reviews_section_${placeId}_${Date.now()}.png`);
      
      // Sort by newest
      await reviewExtractor.sortReviewsByNewest();
      
      // Load more reviews
      await reviewExtractor.scrollToLoadMoreReviews();
      
      // Extract reviews
      const reviews = await reviewExtractor.extractReviews();
      
      // Prepare result
      const result = {
        success: true,
        place_id: placeId,
        place_name: placeName,
        review_count: reviews.length,
        scrape_date: new Date().toISOString(),
        reviews: reviews.slice(0, CONFIG.MAX_REVIEWS),
        metadata: {
          user_agent: this.browserManager.page ? await this.browserManager.page.evaluate(() => navigator.userAgent) : null,
          viewport: this.browserManager.page ? await this.browserManager.page.viewport() : null,
          url: this.browserManager.page ? this.browserManager.page.url() : null
        }
      };
      
      // Save result if in debug mode
      if (CONFIG.DEBUG) {
        await Utils.saveDebugFile(`result_${placeId}_${Date.now()}.json`, result, 'json');
      }
      
      logger.info(`Successfully scraped ${reviews.length} reviews for ${placeName}`);
      return result;
      
    } catch (error) {
      logger.error(`Error scraping reviews for ${placeId}:`, error);
      
      // Retry logic
      if (retryCount < CONFIG.MAX_RETRIES && this.shouldRetry(error)) {
        logger.info(`Retrying... Attempt ${retryCount + 1} of ${CONFIG.MAX_RETRIES}`);
        
        // Close current browser
        await this.browserManager.close();
        
        // Exponential backoff
        const backoffTime = Math.pow(2, retryCount) * 2000;
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        
        return this.scrapeReviews(placeId, retryCount + 1);
      }
      
      return {
        success: false,
        error: error.message,
        place_id: placeId,
        scrape_date: new Date().toISOString(),
        reviews: [],
        retry_count: retryCount
      };
      
    } finally {
      await this.browserManager.close();
    }
  }

  shouldRetry(error) {
    const retryableErrors = [
      'timeout',
      'Navigation failed',
      'net::ERR',
      'Protocol error',
      'Target closed',
      'Connection refused'
    ];
    
    return retryableErrors.some(errType => 
      error.message.toLowerCase().includes(errType.toLowerCase())
    );
  }

  async scrapeMultiplePlaces(placeIds) {
    const results = [];
    
    for (let i = 0; i < placeIds.length; i++) {
      const placeId = placeIds[i];
      logger.info(`Processing place ${i + 1}/${placeIds.length}: ${placeId}`);
      
      try {
        const result = await this.scrapeReviews(placeId);
        results.push(result);
        
        // Add delay between requests to avoid rate limiting
        if (i < placeIds.length - 1) {
          const delay = Math.random() * 5000 + 3000; // 3-8 seconds
          logger.info(`Waiting ${Math.round(delay/1000)}s before next request...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
      } catch (error) {
        logger.error(`Failed to scrape place ${placeId}:`, error);
        results.push({
          success: false,
          error: error.message,
          place_id: placeId,
          scrape_date: new Date().toISOString(),
          reviews: []
        });
      }
    }
    
    return results;
  }
}

// Export the main scraper class and utility functions
export { GoogleMapsReviewScraper, Utils, Logger, CONFIG };

// Default export for backward compatibility
export default async function scrapeReviews(placeId) {
  const scraper = new GoogleMapsReviewScraper();
  return await scraper.scrapeReviews(placeId);
}