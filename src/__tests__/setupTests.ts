import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// This will be used as a global setup for all tests
let mongoServer: MongoMemoryServer;

/**
 * Connect to the in-memory database.
 */
const connect = async () => {
  // Create MongoDB memory server if it doesn't exist
  if (!mongoServer) {
    mongoServer = await MongoMemoryServer.create();
  }
  
  const uri = mongoServer.getUri();
  
  // Disconnect if already connected
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  
  // Connect to the in-memory database
  await mongoose.connect(uri);
  
  // Set NODE_ENV to test
  process.env.NODE_ENV = 'test';
  
  return mongoose.connection;
};

/**
 * Drop database, close the connection and stop mongod.
 */
const closeDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
};

/**
 * Remove all the data for all db collections.
 */
const clearDatabase = async () => {
  if (mongoose.connection.readyState === 0) {
    await connect();
  }
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};

// Setup before all tests
beforeAll(async () => {
  await connect();
});

// Cleanup after all tests
afterAll(async () => {
  await closeDatabase();
});

// Reset data between tests
beforeEach(async () => {
  await clearDatabase();
});

// Export functions to be used in individual test files if needed
export { connect, closeDatabase, clearDatabase };

// Add a dummy test to avoid the "Your test suite must contain at least one test" error
test('Database setup works', () => {
  expect(true).toBe(true);
}); 