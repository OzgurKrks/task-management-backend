# API Endpoint Tests

This directory contains tests for the API endpoints in the task management backend.

## Prerequisites

Before running the tests, make sure you have:

1. Installed all dependencies with `npm install`
2. Installed test-specific dependencies:
   ```
   npm install --save-dev supertest mongodb-memory-server @types/supertest
   ```

## Running Tests

### Run All Tests

To run all tests:

```
npm test
```

### Run Tests with Watch Mode

During development, you can run tests in watch mode, which will re-run tests when files are changed:

```
npm run test:watch
```

### Run Tests with Coverage Report

To run tests and generate a coverage report:

```
npm run test:coverage
```

The coverage report will show how much of your code is covered by tests.

## Test Structure

The tests are organized by feature:

- `controllers/authController.test.ts` - Tests for authentication endpoints
- `controllers/taskController.test.ts` - Tests for task management endpoints
- `controllers/projectController.test.ts` - Tests for project management endpoints

## Test Environment

Tests run using:

1. Jest as the test runner
2. An in-memory MongoDB database (via mongodb-memory-server)
3. Supertest for making HTTP requests to the API

The setup code in `setupTests.ts` handles initializing the test database before tests and cleaning up afterward.

## Writing New Tests

When adding new tests:

1. Create a new test file in the appropriate directory
2. Import the necessary dependencies
3. Write your test cases using Jest's describe/it syntax
4. Make HTTP requests using supertest
5. Assert the expected responses

Example:

```typescript
import request from "supertest";
import app from "../../server";

describe("Example Endpoint", () => {
  it("should return a successful response", async () => {
    const response = await request(app).get("/api/example");
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("data");
  });
});
```
