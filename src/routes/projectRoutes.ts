import express, { Router } from 'express';
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  getProjectMembers,
  searchProjects
} from '../controllers/projectController';
import { authenticate } from '../middleware/authMiddleware';

// Create router instance
const router: Router = express.Router();

// All project routes are protected
router.use(authenticate);

// @route   POST /api/projects
router.post('/', createProject);

// @route   GET /api/projects
router.get('/', getProjects);

// @route   GET /api/projects/search
router.get('/search', searchProjects);

// @route   GET /api/projects/:id
router.get('/:id', getProjectById);

// @route   PUT /api/projects/:id
router.put('/:id', updateProject);

// @route   DELETE /api/projects/:id
router.delete('/:id', deleteProject);

// Project members routes
// @route   GET /api/projects/:id/members
router.get('/:id/members', getProjectMembers);

// @route   POST /api/projects/:id/members
router.post('/:id/members', addProjectMember);

// @route   DELETE /api/projects/:id/members/:memberId
router.delete('/:id/members/:memberId', removeProjectMember);

export default router; 