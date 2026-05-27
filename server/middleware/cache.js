const { getCachedResponse, setCachedResponse } = require('../utils/localCache');

/**
 * Express middleware for high-performance GET request caching.
 * Automatically cached scoped by URL, query params, and authenticated user ID.
 */
exports.apiCacheMiddleware = (duration = 30000) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') return next();

    // Scoped key ensures user sessions are isolated (no cross-profile leakage)
    const key = `${req.originalUrl || req.url}__${req.user?._id || 'anon'}`;
    const cached = getCachedResponse(key);
    
    if (cached) {
      // Serve response instantly
      return res.json(cached);
    }
    
    // Intercept res.json to capture response
    const originalJson = res.json;
    res.json = function (body) {
      if (res.statusCode >= 200 && res.statusCode < 300 && body && body.success !== false) {
        setCachedResponse(key, body);
      }
      return originalJson.call(this, body);
    };
    next();
  };
};
