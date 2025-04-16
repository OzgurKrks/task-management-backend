import express from 'express';
import {
  createTask,
  getTasksByProject,
  getTaskById,
  updateTask,
  deleteTask,
  getTaskLogs,
  updateTaskStatus,
  reorderTask,
  getAllTaskLogs,
  getTaskLogById
} from '../controllers/taskController';
import { authenticate } from '../middleware/authMiddleware';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create a task - Düzeltme: projectId parametresi eklendi
router.post('/projects/:projectId/tasks', createTask);

// Get all tasks for a project
router.get('/projects/:projectId/tasks', getTasksByProject);

// Get all task logs (must come before /:id routes)
router.get('/tasks/logs', getAllTaskLogs);

// Get specific task log by ID
router.get('/tasks/logs/:id', getTaskLogById);

// Individual task routes
// GET /api/tasks/:id - Get a task by ID
router.get('/tasks/:id', getTaskById);

// PUT /api/tasks/:id - Update a task
router.put('/tasks/:id', updateTask);

// DELETE /api/tasks/:id - Delete a task
router.delete('/tasks/:id', deleteTask);

// PATCH /api/tasks/:id/status - Update task status
router.patch('/tasks/:id/status', updateTaskStatus);

// GET /api/tasks/:id/logs - Get task logs
router.get('/tasks/:id/logs', getTaskLogs);

// PUT /api/tasks/:id/order - Reorder task
router.put('/tasks/:id/order', reorderTask);

export default router; 