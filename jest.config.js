module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setupTests.ts"],
  testTimeout: 30000, // Increase timeout for MongoDB operations
  maxWorkers: 1, // Run tests serially
  setupFiles: ["<rootDir>/jest.setup.js"], // Use the setup file
};
