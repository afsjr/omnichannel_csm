# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2: Backend server
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV FRONTEND_DIST=/app/frontend/dist
ENV PORT=3000

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ .

COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "src/app.js"]
