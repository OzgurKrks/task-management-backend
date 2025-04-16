import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/authRoutes';
import projectRoutes from './routes/projectRoutes';
import taskRoutes from './routes/taskRoutes';
import userRoutes from './routes/userRoutes';
import notificationRoutes from './routes/notificationRoutes';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true
  },
  path: '/socket.io',
  serveClient: false,
  transports: ['websocket', 'polling']
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', taskRoutes); // Using base /api since task routes include both project and task-specific endpoints
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);

// Basic route for testing
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Task Management API is running' });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// WebSocket event handling
io.on('connection', (socket) => {
  console.log('A user connected', socket.id);
  
  // Join project room
  socket.on('join-project', (projectId: string) => {
    socket.join(`project:${projectId}`);
    console.log(`User ${socket.id} joined project:${projectId}`);
  });
  
  // Leave project room
  socket.on('leave-project', (projectId: string) => {
    socket.leave(`project:${projectId}`);
    console.log(`User ${socket.id} left project:${projectId}`);
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('A user disconnected', socket.id);
  });
});

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI?.replace('<db_password>', process.env.DB_PASSWORD || '');
const PORT = process.env.PORT || 5000;

mongoose.connect(MONGODB_URI || '')
  .then(() => {
    console.log('Connected to MongoDB');
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
  });

// Export socket.io instance for use in other files
export { io };
export default app; 