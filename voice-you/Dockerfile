# ============================================
# Multi-stage build: Builder stage
# ============================================
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY public ./public
COPY src ./src
COPY nginx.conf ./nginx.conf

# Build the app
RUN npm run build

# ============================================
# Production stage with nginx
# ============================================
FROM nginx:alpine

# Install curl for health check
RUN apk add --no-cache curl

# Copy nginx config
COPY --from=builder /app/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built app from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3001/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
