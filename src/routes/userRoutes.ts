import express, { Router } from 'express';
import { getUsers, getUsersForProject } from '../controllers/userController';
import { authenticate } from '../middleware/authMiddleware';

// Create router instance
const router: Router = express.Router();

// All user routes are protected
router.use(authenticate);

// @route   GET /api/users
router.get('/', getUsers);

// @route   GET /api/users/available-for-project/:projectId
router.get('/available-for-project/:projectId', getUsersForProject);

export default router; 