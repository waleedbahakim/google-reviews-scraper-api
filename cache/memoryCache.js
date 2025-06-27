/**
 * A simple in-memory cache implementation with TTL support
 */
class MemoryCache {
  constructor(defaultTtl = 1800) {
    this.cache = new Map();
    this.defaultTtl = defaultTtl; // Default TTL in seconds (30 minutes)
  }

  /**
   * Set a value in the cache with optional TTL
   * @param {string} key - The cache key
   * @param {any} value - The value to store
   * @param {number} ttl - Time to live in seconds (optional)
   */
  set(key, value, ttl = this.defaultTtl) {
    const item = {
      value,
      expiry: Date.now() + (ttl * 1000)
    };
    this.cache.set(key, item);
    return value;
  }

  /**
   * Get a value from the cache
   * @param {string} key - The cache key
   * @returns {any|null} The cached value or null if not found or expired
   */
  get(key) {
    const item = this.cache.get(key);
    
    // If item doesn't exist or has expired
    if (!item || Date.now() > item.expiry) {
      if (item) this.cache.delete(key); // Clean up expired item
      return null;
    }
    
    return item.value;
  }

  /**
   * Check if a key exists in the cache and is not expired
   * @param {string} key - The cache key
   * @returns {boolean}
   */
  has(key) {
    const item = this.cache.get(key);
    const exists = item && Date.now() <= item.expiry;
    
    if (item && !exists) {
      this.cache.delete(key); // Clean up expired item
    }
    
    return exists;
  }

  /**
   * Delete a key from the cache
   * @param {string} key - The cache key
   * @returns {boolean} True if deleted, false if not found
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Clear all items from the cache
   */
  clear() {
    this.cache.clear();
  }
  
  /**
   * Clean up expired items from the cache
   * @returns {number} Number of items removed
   */
  prune() {
    const now = Date.now();
    let count = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
        count++;
      }
    }
    
    return count;
  }
}

// Create and export a singleton instance with default TTL from env or 30 minutes
const ttl = process.env.CACHE_TTL ? parseInt(process.env.CACHE_TTL) : 1800;
const cache = new MemoryCache(ttl);

export default cache; 