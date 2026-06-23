# ... your frontend build stages above ...

FROM nginx:alpine

# Copy your new custom nginx configuration into the container
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the compiled production build assets from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
