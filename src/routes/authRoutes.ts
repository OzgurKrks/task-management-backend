import express, { Router } from 'express';
import { register, login, getUserProfile } from '../controllers/authController';
import { authenticate } from '../middleware/authMiddleware';

// Create router instance
const router: Router = express.Router();

// Register user
router.post('/register', register);

// Login user
router.post('/login', login);

// Get user profile (protected route)
router.get('/profile', authenticate, getUserProfile);

export default router; 