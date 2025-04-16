import express, { Router } from 'express';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from '../controllers/notificationController';
import { authenticate } from '../middleware/authMiddleware';

const router: Router = express.Router();

// All notification routes are protected
router.use(authenticate);

// @route   GET /api/notifications
router.get('/', getNotifications);

// @route   PUT /api/notifications/:id/read
router.put('/:id/read', markNotificationRead);

// @route   PUT /api/notifications/read-all
router.put('/read-all', markAllNotificationsRead);

export default router; 