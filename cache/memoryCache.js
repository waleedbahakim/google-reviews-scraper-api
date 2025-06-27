
class MemoryCache {
  constructor(defaultTtl = 1800) {
    this.cache = new Map();
    this.defaultTtl = defaultTtl; 
  }


  set(key, value, ttl = this.defaultTtl) {
    const item = {
      value,
      expiry: Date.now() + (ttl * 1000)
    };
    this.cache.set(key, item);
    return value;
  }


  get(key) {
    const item = this.cache.get(key);
    
    if (!item || Date.now() > item.expiry) {
      if (item) this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }


  has(key) {
    const item = this.cache.get(key);
    const exists = item && Date.now() <= item.expiry;
    
    if (item && !exists) {
      this.cache.delete(key); 
    }
    
    return exists;
  }

  delete(key) {
    return this.cache.delete(key);
  }


  clear() {
    this.cache.clear();
  }
  

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

const ttl = process.env.CACHE_TTL ? parseInt(process.env.CACHE_TTL) : 1800;
const cache = new MemoryCache(ttl);

export default cache; 