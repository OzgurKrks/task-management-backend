import { Request, Response } from 'express';
import Task, { TaskStatus, TaskPriority, ITask } from '../models/Task';
import Project from '../models/Project';
import TaskLog from '../models/TaskLog';
import { UserRole } from '../models/User';
import mongoose, { Document } from 'mongoose';
import { emitTaskCreated, emitTaskUpdated, emitTaskDeleted, emitTasksReordered } from '../utils/socketEvents';

// Helper type for project and task with any to avoid TS errors with document properties
type ProjectDoc = any;
type TaskDoc = any;

// @desc    Create a new task
// @route   POST /api/projects/:projectId/tasks
// @access  Private
export const createTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title,
      description,
      status = TaskStatus.PENDING,
      priority = TaskPriority.MEDIUM,
      assignedTo
    } = req.body;
    
    // Route parametresinden projectId alınıyor
    const projectId = req.params.projectId;
    
    // Check if project exists and user has access
    const project: ProjectDoc = await Project.findById(projectId);
    
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    
    // Check if user is a member of the project
    const isProjectMember = project.members.includes(req.user._id) || 
                           project.owner.toString() === req.user._id.toString();
    
    if (!isProjectMember && req.user.role !== UserRole.ADMIN) {
      res.status(403).json({ message: 'Not authorized to create tasks in this project' });
      return;
    }
    
    const task = await Task.create({
      title,
      description,
      status,
      priority,
      project: projectId,
      assignedTo: assignedTo || req.user._id,
      createdBy: req.user._id
    });
    
    // Create task log for creation
    await TaskLog.create({
      task: task._id,
      user: req.user._id,
      newStatus: status,
      newPriority: priority,
      newAssignee: assignedTo || req.user._id,
      message: 'Task created'
    });
    
    // Populate the created task
    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('project', 'name');
    
    // Emit WebSocket event for task creation
    if (populatedTask) {
      emitTaskCreated(projectId, populatedTask as any);
      
      // Create notification for the assigned user if it's not the creator
      if (assignedTo && assignedTo !== req.user._id.toString()) {
        const { createNotification } = await import('../controllers/notificationController');
        await createNotification({
          userId: assignedTo,
          type: 'task_assignment',
          message: `You have been assigned to task: ${title} in project ${project.name}`,
          relatedProject: projectId,
          relatedTask: (task._id as any).toString()
        });
      }
    }
    
    res.status(201).json(populatedTask);
  } catch (error: any) {
    console.error('Task creation error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get tasks for a project
// @route   GET /api/projects/:projectId/tasks
// @access  Private
export const getTasksByProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const projectId = req.params.projectId;
    
    // Check if project exists and user has access
    const project: ProjectDoc = await Project.findById(projectId);
    
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    
    // Check if user is a member of the project
    const isProjectMember = project.members.includes(req.user._id) || 
                           project.owner.toString() === req.user._id.toString();
    
    if (!isProjectMember && req.user.role !== UserRole.ADMIN) {
      res.status(403).json({ message: 'Not authorized to view tasks in this project' });
      return;
    }
    
    const tasks = await Task.find({ project: projectId })
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('project', 'name');
    
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a task by ID
// @route   GET /api/tasks/:id
// @access  Private
export const getTaskById = async (req: Request, res: Response): Promise<void> => {
  try {
    const task: TaskDoc = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('project', 'name');
    
    if (!task) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }
    
    // Check if user is a member of the project
    const project: ProjectDoc = await Project.findById(task.project);
    
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    
    const isProjectMember = project.members.includes(req.user._id) || 
                           project.owner.toString() === req.user._id.toString();
    
    if (!isProjectMember && req.user.role !== UserRole.ADMIN) {
      res.status(403).json({ message: 'Not authorized to view this task' });
      return;
    }
    
    res.json(task);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a task
// @route   PUT /api/tasks/:id
// @access  Private
export const updateTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title,
      description,
      status,
      priority,
      assignedTo
    } = req.body;
    
    const task: TaskDoc = await Task.findById(req.params.id);
    
    if (!task) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }
    
    // Check if user is a member of the project
    const project: ProjectDoc = await Project.findById(task.project);
    
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    
    const isProjectMember = project.members.includes(req.user._id) || 
                           project.owner.toString() === req.user._id.toString();
    
    if (!isProjectMember && req.user.role !== UserRole.ADMIN) {
      res.status(403).json({ message: 'Not authorized to update this task' });
      return;
    }
    
    // Create task log for changes
    const logData: any = {
      task: task._id,
      user: req.user._id,
      message: 'Task updated'
    };
    
    // Track status changes
    if (status && status !== task.status) {
      logData.previousStatus = task.status;
      logData.newStatus = status;
    }
    
    // Track priority changes
    if (priority && priority !== task.priority) {
      logData.previousPriority = task.priority;
      logData.newPriority = priority;
    }
    
    // Track assignee changes
    const previousAssigneeId = task.assignedTo ? task.assignedTo.toString() : null;
    let assigneeChanged = false;
    
    if (assignedTo && assignedTo !== previousAssigneeId) {
      logData.previousAssignee = task.assignedTo;
      logData.newAssignee = assignedTo;
      assigneeChanged = true;
    }
    
    // Update task
    task.title = title || task.title;
    task.description = description || task.description;
    task.status = status || task.status;
    task.priority = priority || task.priority;
    
    if (assignedTo) {
      task.assignedTo = assignedTo;
    }
    
    await task.save();
    
    // Create task log if there were changes
    if (status || priority || assignedTo) {
      await TaskLog.create(logData);
    }
    
    // Get updated task with populated fields
    const updatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('project', 'name');
    
    // Emit WebSocket event for task update
    const projectId = task.project.toString();
    if (updatedTask) {
      emitTaskUpdated(projectId, updatedTask as any);
      
      // Send notification if assignee changed and it's not the current user
      if (assigneeChanged && assignedTo !== req.user._id.toString()) {
        const { createNotification } = await import('../controllers/notificationController');
        await createNotification({
          userId: assignedTo,
          type: 'task_assignment',
          message: `You have been assigned to task: ${task.title} in project ${project.name}`,
          relatedProject: projectId,
          relatedTask: (task._id as any).toString()
        });
      }
    }
    
    res.json(updatedTask);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private
export const deleteTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const task: TaskDoc = await Task.findById(req.params.id);
    
    if (!task) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }
    
    // Check if user is a member of the project or created the task
    const project: ProjectDoc = await Project.findById(task.project);
    
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    
    const isProjectOwner = project.owner.toString() === req.user._id.toString();
    const isTaskCreator = task.createdBy.toString() === req.user._id.toString();
    
    if (!isProjectOwner && !isTaskCreator && req.user.role !== UserRole.ADMIN) {
      res.status(403).json({ message: 'Not authorized to delete this task' });
      return;
    }
    
    const projectId = task.project.toString();
    const taskId = task._id.toString();
    
    // Delete the task
    await task.deleteOne();
    
    // Delete associated logs
    await TaskLog.deleteMany({ task: task._id });
    
    // Emit WebSocket event for task deletion
    emitTaskDeleted(projectId, taskId);
    
    res.json({ message: 'Task removed' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get task logs
// @route   GET /api/tasks/:id/logs
// @access  Private
export const getTaskLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const task: TaskDoc = await Task.findById(req.params.id);
    
    if (!task) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }
    
    // Check if user is a member of the project
    const project: ProjectDoc = await Project.findById(task.project);
    
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    
    const isProjectMember = project.members.includes(req.user._id) || 
                           project.owner.toString() === req.user._id.toString();
    
    if (!isProjectMember && req.user.role !== UserRole.ADMIN) {
      res.status(403).json({ message: 'Not authorized to view logs for this task' });
      return;
    }
    
    const logs = await TaskLog.find({ task: task._id })
      .populate('user', 'name email')
      .populate('previousAssignee', 'name email')
      .populate('newAssignee', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update task status (for drag and drop)
// @route   PATCH /api/tasks/:id/status
// @access  Private
export const updateTaskStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.body;
    
    if (!Object.values(TaskStatus).includes(status as TaskStatus)) {
      res.status(400).json({ message: 'Invalid status value' });
      return;
    }
    
    const taskId = req.params.id;
    
    // Find task by ID
    const task = await Task.findById(taskId);
    
    if (!task) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }
    
    // Check if user has permission to update this task
    const project: ProjectDoc = await Project.findById(task.project);
    
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    
    const isProjectMember = project.members.includes(req.user._id) || 
                           project.owner.toString() === req.user._id.toString();
    
    if (!isProjectMember && req.user.role !== UserRole.ADMIN) {
      res.status(403).json({ message: 'Not authorized to update this task' });
      return;
    }
    
    // Only update the status field
    const previousStatus = task.status;
    task.status = status as TaskStatus;
    await task.save();
    
    // Create task log for status update
    await TaskLog.create({
      task: task._id,
      user: req.user._id,
      previousStatus,
      newStatus: status,
      message: `Status changed from ${previousStatus} to ${status}`
    });
    
    // Populate the updated task
    const updatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('project', 'name');
    
    // Emit WebSocket event for task update
    if (updatedTask) {
      const projectId = (updatedTask as any).project._id.toString();
      emitTaskUpdated(projectId, updatedTask as any);
      
      // Send notification to assignee if it's not the current user
      const assigneeId = task.assignedTo ? task.assignedTo.toString() : null;
      if (assigneeId && assigneeId !== req.user._id.toString()) {
        const { createNotification } = await import('../controllers/notificationController');
        await createNotification({
          userId: assigneeId,
          type: 'task_update',
          message: `Task status updated: "${task.title}" is now ${status} in project ${project.name}`,
          relatedProject: projectId,
          relatedTask: (task._id as any).toString()
        });
      }
    }
    
    res.json(updatedTask);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reorder a task within a project
// @route   PUT /api/projects/:projectId/tasks/:taskId/reorder
// @access  Private
export const reorderTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId, taskId } = req.params;
    const { newPosition } = req.body;
    
    console.log(`Reorder request received: Task ${taskId} in Project ${projectId} to position ${newPosition}`);
    
    if (newPosition === undefined || typeof newPosition !== 'number') {
      console.log('Invalid position value:', newPosition);
      res.status(400).json({ message: 'New position is required and must be a number' });
      return;
    }
    
    // Find the task
    const task: TaskDoc = await Task.findById(taskId);
    
    if (!task) {
      console.log('Task not found:', taskId);
      res.status(404).json({ message: 'Task not found' });
      return;
    }
    
    // Check if task belongs to the project
    if (task.project.toString() !== projectId) {
      console.log('Task does not belong to project:', {taskProject: task.project.toString(), requestedProject: projectId});
      res.status(400).json({ message: 'Task does not belong to this project' });
      return;
    }
    
    // Check if user has permission to reorder tasks in this project
    const project: ProjectDoc = await Project.findById(projectId);
    
    if (!project) {
      console.log('Project not found:', projectId);
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    
    const isProjectMember = project.members.includes(req.user._id) || 
                          project.owner.toString() === req.user._id.toString();
    
    if (!isProjectMember && req.user.role !== UserRole.ADMIN) {
      console.log('User not authorized to reorder tasks:', req.user._id);
      res.status(403).json({ message: 'Not authorized to reorder tasks in this project' });
      return;
    }
    
    // Get all tasks for this project to handle reordering
    console.log('Fetching all tasks for project:', projectId);
    const projectTasks: TaskDoc[] = await Task.find({ project: projectId }).sort({ position: 1 });
    
    console.log(`Found ${projectTasks.length} tasks for project ${projectId}`);
    
    // If position field doesn't exist yet, initialize for all tasks
    let needsPositionInit = false;
    if (projectTasks.some((t: TaskDoc) => t.position === undefined)) {
      console.log('Initializing position field for tasks');
      needsPositionInit = true;
      projectTasks.forEach((t: TaskDoc, index: number) => {
        t.position = index;
      });
    }
    
    // Handle the reordering
    const currentPosition = projectTasks.findIndex((t: TaskDoc) => t._id.toString() === taskId);
    
    if (currentPosition === -1) {
      console.log('Task not found in project tasks array:', taskId);
      res.status(404).json({ message: 'Task not found in project tasks' });
      return;
    }
    
    console.log(`Current position: ${currentPosition}, New position: ${newPosition}`);
    
    // Ensure new position is within bounds
    const safeNewPosition = Math.max(0, Math.min(newPosition, projectTasks.length - 1));
    if (safeNewPosition !== newPosition) {
      console.log(`Adjusted position from ${newPosition} to ${safeNewPosition}`);
    }
    
    // Reorder the tasks
    const [movedTask] = projectTasks.splice(currentPosition, 1);
    projectTasks.splice(safeNewPosition, 0, movedTask);
    
    console.log('Updating position field for all tasks');
    
    // Update the position field for all affected tasks
    await Promise.all(
      projectTasks.map((t: TaskDoc, index: number) => {
        t.position = index;
        return t.save();
      })
    );
    
    // Log the reordering
    await TaskLog.create({
      task: taskId,
      user: req.user._id,
      message: `Task reordered from position ${currentPosition} to ${safeNewPosition}`
    });
    
    // Emit WebSocket event for task update
    emitTasksReordered(projectId, projectTasks);
    
    console.log('Task reordered successfully');
    
    res.status(200).json({ 
      message: 'Task reordered successfully',
      tasks: projectTasks.map((t: TaskDoc) => ({
        _id: t._id,
        title: t.title,
        position: t.position
      }))
    });
  } catch (error: any) {
    console.error('Error reordering task:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all task logs
// @route   GET /api/tasks/logs
// @access  Private
export const getAllTaskLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    // Find all task logs related to the user's projects
    // First, get all projects where the user is a member or owner
    const projects = await Project.find({
      $or: [
        { owner: req.user._id },
        { members: req.user._id }
      ]
    });
    
    const projectIds = projects.map(project => project._id);
    
    // Get all tasks from these projects
    const tasks = await Task.find({ project: { $in: projectIds } });
    const taskIds = tasks.map(task => task._id);
    
    // Find logs for these tasks
    const logs = await TaskLog.find({ task: { $in: taskIds } })
      .populate('user', 'name email')
      .populate('previousAssignee', 'name email')
      .populate('newAssignee', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a specific task log by ID
// @route   GET /api/tasks/logs/:id
// @access  Private
export const getTaskLogById = async (req: Request, res: Response): Promise<void> => {
  try {
    const taskLog = await TaskLog.findById(req.params.id)
      .populate('user', 'name email')
      .populate('previousAssignee', 'name email')
      .populate('newAssignee', 'name email');
    
    if (!taskLog) {
      res.status(404).json({ message: 'Task log not found' });
      return;
    }
    
    // Get the associated task
    const task: TaskDoc = await Task.findById(taskLog.task);
    
    if (!task) {
      res.status(404).json({ message: 'Associated task not found' });
      return;
    }
    
    // Check if the user has access to the project
    const project: ProjectDoc = await Project.findById(task.project);
    
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    
    const isProjectMember = project.members.includes(req.user._id) || 
                           project.owner.toString() === req.user._id.toString();
    
    if (!isProjectMember && req.user.role !== UserRole.ADMIN) {
      res.status(403).json({ message: 'Not authorized to view this task log' });
      return;
    }
    
    res.json(taskLog);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}; 