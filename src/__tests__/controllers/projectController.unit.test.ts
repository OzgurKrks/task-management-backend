import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { getProjects, createProject } from '../../controllers/projectController';
import Project from '../../models/Project';
import { UserRole } from '../../models/User';

// Mock Project model for unit tests
jest.mock('../../models/Project');

// Mock socket events utility
jest.mock('../../utils/socketEvents', () => ({
  emitProjectUpdated: jest.fn(),
  emitProjectDeleted: jest.fn()
}));

describe('Project Controller Unit Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseStatus: number;
  let responseJson: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock response
    responseStatus = 0;
    responseJson = null;
    
    mockResponse = {
      status: jest.fn().mockImplementation(code => {
        responseStatus = code;
        return mockResponse;
      }),
      json: jest.fn().mockImplementation(result => {
        responseJson = result;
        return mockResponse;
      })
    };
  });

  describe('getProjects', () => {
    it('should handle errors and return 500', async () => {
      // Setup
      const errorMessage = 'Database error';
      mockRequest = {
        user: {
          _id: 'user123',
          role: UserRole.DEVELOPER
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
    it('should handle errors during project creation', async () => {
      // Setup
      const errorMessage = 'Validation error';
      mockRequest = {
        user: {
          _id: 'user123',
          role: UserRole.DEVELOPER
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