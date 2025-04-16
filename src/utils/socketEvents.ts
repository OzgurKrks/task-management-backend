import { io } from '../index';
import { ITask } from '../models/Task';
import { IProject } from '../models/Project';
import mongoose from 'mongoose';

// Socket event names
export const SOCKET_EVENTS = {
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_DELETED: 'task:deleted',
  PROJECT_UPDATED: 'project:updated',
  PROJECT_DELETED: 'project:deleted',
  COMMENT_ADDED: 'comment:added'
};

// Emit task created event
export const emitTaskCreated = (projectId: string, task: ITask): void => {
  io.to(`project:${projectId}`).emit(SOCKET_EVENTS.TASK_CREATED, task);
};

// Emit task updated event
export const emitTaskUpdated = (projectId: string, task: ITask): void => {
  io.to(`project:${projectId}`).emit(SOCKET_EVENTS.TASK_UPDATED, task);
};

// Emit task deleted event
export const emitTaskDeleted = (projectId: string, taskId: string): void => {
  io.to(`project:${projectId}`).emit(SOCKET_EVENTS.TASK_DELETED, { 
    taskId, 
    projectId  // Include projectId in the payload
  });
};

// Emit project updated event
export const emitProjectUpdated = (project: IProject): void => {
  const projectId = (project._id as mongoose.Types.ObjectId).toString();
  io.to(`project:${projectId}`).emit(SOCKET_EVENTS.PROJECT_UPDATED, project);
};

// Emit project deleted event
export const emitProjectDeleted = (projectId: string): void => {
  io.to(`project:${projectId}`).emit(SOCKET_EVENTS.PROJECT_DELETED, { projectId });
};

// Emit comment added event
export const emitCommentAdded = (projectId: string, taskId: string, comment: any): void => {
  io.to(`project:${projectId}`).emit(SOCKET_EVENTS.COMMENT_ADDED, { taskId, comment });
};

// Emit task reordered event to all clients in the project room
export const emitTasksReordered = (projectId: string, tasks: any[]): void => {
  io.to(`project:${projectId}`).emit('tasksReordered', {
    projectId,
    tasks: tasks.map(task => ({
      _id: task._id,
      title: task.title,
      position: task.position,
      status: task.status
    }))
  });
}; 