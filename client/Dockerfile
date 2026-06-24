# Stage 1: Build stage (Switch to ECR Public Node mirror)
FROM public.ecr.aws/docker/library/node:18-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Production environment stage (Switch to ECR Public Nginx mirror)
FROM public.ecr.aws/nginx/nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
