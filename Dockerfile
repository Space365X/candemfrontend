# Stage 1: Build the frontend application
FROM node:18 AS builder

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./
# If using yarn, replace with: COPY yarn.lock ./

# Install dependencies
RUN npm install
# If using yarn, replace with: RUN yarn install

# Copy the rest of the application code
COPY . .

# Build the app (creates a "build" or "dist" folder)
RUN npm run build
# If using yarn, replace with: RUN yarn build
# Adjust the build command based on your framework (e.g., `ng build` for Angular)

# Stage 2: Serve the static files with NGINX
FROM nginx:alpine

# Copy the build output from the builder stage to NGINX
COPY --from=builder /app/build /usr/share/nginx/html
# If your build folder is named "dist" (common for Angular/Vue), use:
# COPY --from=builder /app/dist /usr/share/nginx/html

# Copy a custom NGINX configuration (optional, see below)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 (default for NGINX)
EXPOSE 80

# Start NGINX
CMD ["nginx", "-g", "daemon off;"]