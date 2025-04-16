import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { getProjects, createProject } from '../../controllers/projectController';
import Project from '../../models/Project';
import { UserRole } from '../../models/User';

// Mock Project model
jest.mock('../../models/Project');

// Mock socket events utility
jest.mock('../../utils/socketEvents', () => ({
  emitProjectUpdated: jest.fn(),
  emitProjectDeleted: jest.fn()
}));

describe('Project Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseObject = {};

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock response
    responseObject = {
      statusCode: 0,
      jsonObject: {}
    };
    
    mockResponse = {
      status: jest.fn().mockImplementation(code => {
        responseObject.statusCode = code;
        return mockResponse;
      }),
      json: jest.fn().mockImplementation(result => {
        responseObject.jsonObject = result;
        return mockResponse;
      })
    };
  });

  describe('getProjects', () => {
    it('should return all projects for admin user', async () => {
      // Setup
      const mockProjects = [
        { _id: new mongoose.Types.ObjectId(), name: 'Project 1' },
        { _id: new mongoose.Types.ObjectId(), name: 'Project 2' }
      ];
      
      mockRequest = {
        user: {
          _id: new mongoose.Types.ObjectId().toString(),
          role: UserRole.ADMIN
        }
      };
      
      // Mock Project.find to return projects
      (Project.find as jest.Mock).mockImplementation(() => ({
        populate: jest.fn().mockImplementation(() => ({
          populate: jest.fn().mockResolvedValue(mockProjects)
        }))
      }));
      
      // Execute
      await getProjects(mockRequest as Request, mockResponse as Response);
      
      // Assert
      expect(Project.find).toHaveBeenCalledWith({});
      expect(mockResponse.json).toHaveBeenCalledWith(mockProjects);
    });

    it('should return user-specific projects for non-admin user', async () => {
      // Setup
      const userId = new mongoose.Types.ObjectId().toString();
      const mockProjects = [
        { _id: new mongoose.Types.ObjectId(), name: 'Project 1', owner: userId }
      ];
      
      mockRequest = {
        user: {
          _id: userId,
          role: UserRole.USER
        }
      };
      
      // Mock Project.find to return projects
      (Project.find as jest.Mock).mockImplementation(() => ({
        populate: jest.fn().mockImplementation(() => ({
          populate: jest.fn().mockResolvedValue(mockProjects)
        }))
      }));
      
      // Execute
      await getProjects(mockRequest as Request, mockResponse as Response);
      
      // Assert
      expect(Project.find).toHaveBeenCalledWith({
        $or: [
          { owner: userId },
          { members: { $in: [userId] } }
        ]
      });
      expect(mockResponse.json).toHaveBeenCalledWith(mockProjects);
    });

    it('should handle errors', async () => {
      // Setup
      const errorMessage = 'Database error';
      mockRequest = {
        user: {
          _id: new mongoose.Types.ObjectId().toString(),
          role: UserRole.USER
        }
      };
      
      // Mock Project.find to throw error
      (Project.find as jest.Mock).mockImplementation(() => {
        throw new Error(errorMessage);
      });
      
      // Execute
      await getProjects(mockRequest as Request, mockResponse as Response);
      
      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: errorMessage });
    });
  });

  describe('createProject', () => {
    it('should create a new project successfully', async () => {
      // Setup
      const userId = new mongoose.Types.ObjectId().toString();
      const projectData = {
        name: 'New Project',
        description: 'Project Description'
      };
      
      const createdProject = {
        _id: new mongoose.Types.ObjectId(),
        ...projectData,
        owner: userId,
        members: [userId]
      };
      
      mockRequest = {
        user: {
          _id: userId,
          role: UserRole.USER
        },
        body: projectData
      };
      
      // Mock Project.create to return the new project
      (Project.create as jest.Mock).mockResolvedValue(createdProject);
      
      // Execute
      await createProject(mockRequest as Request, mockResponse as Response);
      
      // Assert
      expect(Project.create).toHaveBeenCalledWith({
        name: projectData.name,
        description: projectData.description,
        owner: userId,
        members: [userId]
      });
      
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(createdProject);
    });

    it('should handle errors during project creation', async () => {
      // Setup
      const errorMessage = 'Validation error';
      mockRequest = {
        user: {
          _id: new mongoose.Types.ObjectId().toString(),
          role: UserRole.USER
        },
        body: {
          name: 'New Project',
          description: 'Project Description'
        }
      };
      
      // Mock Project.create to throw error
      (Project.create as jest.Mock).mockImplementation(() => {
        throw new Error(errorMessage);
      });
      
      // Execute
      await createProject(mockRequest as Request, mockResponse as Response);
      
      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: errorMessage });
    });
  });
});