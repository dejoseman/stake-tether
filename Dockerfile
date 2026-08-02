# Stage 1: Build the React Frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Setup the Node Backend
FROM node:18-alpine
WORKDIR /app

# Copy backend dependencies
COPY package*.json ./
RUN npm install --production

# Copy backend source code
COPY . .

# Copy built frontend from Stage 1
COPY --from=frontend-builder /app/client/dist ./client/dist

# Expose the port the app runs on
EXPOSE 3000

# Start the Node server
CMD ["node", "server.js"]
