FROM node:20-alpine

WORKDIR /app

# Copy package files and tsconfig.json first
COPY package*.json tsconfig.json ./

# Install dependencies
RUN npm install --ignore-scripts

# Copy the rest of the application
COPY . .

# Build manually after all files are copied
RUN npm run build

# Expose the port the app runs on
EXPOSE 5000

# Command to run the application
CMD ["node", "dist/server.js"] 