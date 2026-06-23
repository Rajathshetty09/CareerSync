# Step 1: Build the React/Vite application using AWS ECR Mirror
FROM public.ecr.aws/docker/library/node:18-alpine AS build
WORKDIR /app
# ... your frontend build stages above ...

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install
FROM nginx:alpine

# Copy the rest of the application code and build it
COPY . .
RUN npm run build
# Copy your new custom nginx configuration into the container
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Step 2: Serve using AWS ECR Mirror Nginx image
FROM public.ecr.aws/nginx/nginx:alpine
# Vite defaults its production output folder to 'dist'
# Copy the compiled production build assets from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
