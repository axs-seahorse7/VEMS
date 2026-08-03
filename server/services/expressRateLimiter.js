import rateLimit from "express-rate-limit";
import {ipKeyGenerator } from "express-rate-limit";

export const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 min
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many requests. Please try again later."
  },

  keyGenerator: (req) => {
    return req.userId || ipKeyGenerator(req);
  },

   handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many requests"
    });
  }

});

export const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 120,

  message: {
    success: false,
    message:
      "Too many login attempts. Try again later."
  }
});

export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message:
      "Too many API requests"
  }
});


export const heavyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message:
      "Heavy operation limit exceeded"
  }
});