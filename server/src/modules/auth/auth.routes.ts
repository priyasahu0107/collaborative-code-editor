/**
 * Authentication routes.
 */

import { Router } from 'express';
import cookieParser from 'cookie-parser';
import { register, login, logout, getCurrentUser } from './auth.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authRateLimiter } from '../../middleware/rateLimiter.js';

const router = Router();

// Cookie parser middleware
router.use(cookieParser());

// Public routes with rate limiting
router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);

// Protected routes
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getCurrentUser);

export default router;
