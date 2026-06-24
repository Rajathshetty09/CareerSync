# Stage 1: Build stage
FROM node:18-alpine AS build
WORKDIR /app

# Copy package management files first for better caching
COPY package*.json ./
RUN npm install

# Copy all the frontend source files
COPY . .

# CRITICAL STEP: Build the application to generate the 'dist' folder
RUN npm run build

# Stage 2: Production environment stage
FROM nginx:stable-alpine
# Copy the built assets from the previous 'build' stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
