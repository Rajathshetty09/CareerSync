FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the backend source code
COPY . .

# Expose the port your express app runs on
EXPOSE 5000

# Start the application directly using node
CMD ["node", "index.js"]
