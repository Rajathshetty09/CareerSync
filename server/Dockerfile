# Line 1: Switched to public ECR mirror to bypass Docker Hub rate limits
FROM public.ecr.aws/docker/library/node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the backend source code
COPY . .

# Expose the port your express app runs on
EXPOSE 5000

# FIX: Changed "index.js" to "server.js" to match your repository file tree
CMD ["node", "server.js"]
