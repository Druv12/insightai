FROM node:18

WORKDIR /app

COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

WORKDIR /app/frontend
RUN npm install

WORKDIR /app/backend
RUN npm install

WORKDIR /app
COPY . .

WORKDIR /app/frontend
RUN npm run build

EXPOSE 7860

WORKDIR /app/backend
CMD ["node", "server.js"]