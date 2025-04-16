import mongoose from 'mongoose';
import Task, { TaskStatus, TaskPriority } from '../../models/Task';
import { connect, clearDatabase, closeDatabase } from '../setupTests';

// Define a type for mongoose validation errors
interface ValidationError extends Error {
  errors: {
    [path: string]: mongoose.Error.ValidatorError;
  };
}

describe('Task Model', () => {
  // Use the shared database connection
  beforeAll(async () => {
    await connect();
  });

  // Clear the database between tests
  afterEach(async () => {
    await clearDatabase();
  });

  // Disconnect after all tests
  afterAll(async () => {
    await closeDatabase();
  });

  it('should create a new task successfully', async () => {
    const taskData = {
      title: 'Test Task',
      description: 'This is a test task',
      status: TaskStatus.PENDING,
      priority: TaskPriority.MEDIUM,
      project: new mongoose.Types.ObjectId(),
      assignedTo: new mongoose.Types.ObjectId(),
      createdBy: new mongoose.Types.ObjectId()
    };

    const task = new Task(taskData);
    const savedTask = await task.save();

    // Verify saved task
    expect(savedTask._id).toBeDefined();
    expect(savedTask.title).toBe(taskData.title);
    expect(savedTask.description).toBe(taskData.description);
    expect(savedTask.status).toBe(taskData.status);
    expect(savedTask.priority).toBe(taskData.priority);
    expect((savedTask.project as mongoose.Types.ObjectId).toString()).toBe(taskData.project.toString());
    expect((savedTask.assignedTo as mongoose.Types.ObjectId).toString()).toBe(taskData.assignedTo.toString());
    expect((savedTask.createdBy as mongoose.Types.ObjectId).toString()).toBe(taskData.createdBy.toString());
    expect(savedTask.createdAt).toBeDefined();
    expect(savedTask.updatedAt).toBeDefined();
  });

  it('should fail validation if required fields are missing', async () => {
    const task = new Task({});
    let error: ValidationError | null = null;

    try {
      await task.validate();
    } catch (e) {
      error = e as ValidationError;
    }

    expect(error).toBeDefined();
    expect(error?.errors.title).toBeDefined();
    expect(error?.errors.description).toBeDefined();
    expect(error?.errors.project).toBeDefined();
    expect(error?.errors.assignedTo).toBeDefined();
    expect(error?.errors.createdBy).toBeDefined();
  });

  it('should have default status of PENDING if not provided', () => {
    const task = new Task({
      title: 'Test Task',
      description: 'This is a test task',
      project: new mongoose.Types.ObjectId(),
      assignedTo: new mongoose.Types.ObjectId(),
      createdBy: new mongoose.Types.ObjectId()
    });

    expect(task.status).toBe(TaskStatus.PENDING);
  });

  it('should have default priority of MEDIUM if not provided', () => {
    const task = new Task({
      title: 'Test Task',
      description: 'This is a test task',
      project: new mongoose.Types.ObjectId(),
      assignedTo: new mongoose.Types.ObjectId(),
      createdBy: new mongoose.Types.ObjectId()
    });

    expect(task.priority).toBe(TaskPriority.MEDIUM);
  });
}); 