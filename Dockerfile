FROM node:20-slim

WORKDIR /app

# Copy package files
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install dependencies
WORKDIR /app/frontend
RUN npm install

WORKDIR /app/backend
RUN npm install

# Copy source code
WORKDIR /app
COPY . .

# Build frontend
WORKDIR /app/frontend
RUN npm run build

# Expose Hugging Face port
EXPOSE 7860

# Start backend (which will inject config and serve frontend)
WORKDIR /app/backend
CMD ["node", "server.js"]