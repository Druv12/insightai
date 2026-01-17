FROM node:18-slim

WORKDIR /app

# Copy package files
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install dependencies
RUN cd frontend && npm ci --only=production
RUN cd backend && npm ci --only=production

# Copy source code
COPY . .

# Build frontend
RUN cd frontend && npm run build

# Expose Hugging Face port
EXPOSE 7860

# Start backend server
WORKDIR /app/backend
CMD ["npm", "start"]
