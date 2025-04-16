import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../server';
import User, { IUser } from '../../models/User';
import { connect, clearDatabase, closeDatabase } from '../setupTests';

// Set JWT_SECRET for tests
process.env.JWT_SECRET = 'test-integration-secret-key';

describe('Authentication Integration Tests', () => {
  let userId: string;
  let authToken: string;

  beforeAll(async () => {
    await connect();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  it('should register a new user and return token', async () => {
    const userData = {
      name: 'Integration Test User',
      email: 'integration@example.com',
      password: 'password123',
      role: 'developer'
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(userData);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('token');
    expect(response.body.name).toBe(userData.name);
    
    // Save for later tests
    authToken = response.body.token;
    userId = response.body._id;
  });

  it('should authenticate with token and access protected route', async () => {
    // First create a user and get token
    const userData = {
      name: 'Auth Test User',
      email: 'authtest@example.com',
      password: 'password123',
      role: 'developer'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);

    expect(registerResponse.status).toBe(201);
    authToken = registerResponse.body.token;

    // Test protected route access
    const profileResponse = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${authToken}`);

    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body).toHaveProperty('_id');
    expect(profileResponse.body.email).toBe(userData.email);
  });

  it('should reject access without valid token', async () => {
    const response = await request(app)
      .get('/api/auth/profile');
  
    expect(response.status).toBe(401);
  });

  it('should reject access with invalid token', async () => {
    const response = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', 'Bearer invalid-token');
  
    expect(response.status).toBe(401);
  });
}); 