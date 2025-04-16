import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../server';
import User from '../../models/User';
import { connect, clearDatabase, closeDatabase } from '../setupTests';

// Use the shared database connection
beforeAll(async () => {
  await connect();
});

// Clean up after tests
afterAll(async () => {
  await closeDatabase();
});

// Clean up between tests
beforeEach(async () => {
  await clearDatabase();
});

describe('Auth Controller', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'developer'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.name).toBe(userData.name);
      expect(response.body.email).toBe(userData.email);
      expect(response.body.role).toBe(userData.role);
    });

    it('should return 400 if user already exists', async () => {
      // Create a user first
      await User.create({
        name: 'Existing User',
        email: 'exists@example.com',
        password: 'password123',
        role: 'developer'
      });

      // Try to register with the same email
      const userData = {
        name: 'Another User',
        email: 'exists@example.com',
        password: 'anotherpassword',
        role: 'developer'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('already exists');
    });

    it('should return 400 for invalid data', async () => {
      // Missing required fields
      const userData = {
        name: 'Invalid User',
        // Missing email and password
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Validation error');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user and return token', async () => {
      // Create a user first
      const user = {
        name: 'Login Test User',
        email: 'login@example.com',
        password: 'password123',
        role: 'developer'
      };

      await User.create(user);

      // Try to login
      const loginData = {
        email: 'login@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.name).toBe(user.name);
      expect(response.body.email).toBe(user.email);
    });

    it('should return 401 for invalid credentials', async () => {
      // Create a user first
      await User.create({
        name: 'Auth User',
        email: 'auth@example.com',
        password: 'password123',
        role: 'developer'
      });

      // Try to login with wrong password
      const loginData = {
        email: 'auth@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid email or password');
    });

    it('should return 401 for non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid email or password');
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should get user profile for authenticated user', async () => {
      // Create a user first
      const user = await User.create({
        name: 'Profile User',
        email: 'profile@example.com',
        password: 'password123',
        role: 'developer'
      });

      // Login to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'profile@example.com',
          password: 'password123'
        });

      const token = loginResponse.body.token;

      // Get profile with token
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('_id');
      expect(response.body.email).toBe('profile@example.com');
    });

    it('should return 401 for missing token', async () => {
      const response = await request(app)
        .get('/api/auth/profile');

      expect(response.status).toBe(401);
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalidtoken');

      expect(response.status).toBe(401);
    });
  });
}); 