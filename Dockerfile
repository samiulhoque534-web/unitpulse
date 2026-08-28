# Build & Run Container for UNITPULSE
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build Client
RUN npm run build:client

# Production Image
FROM node:20-alpine AS runner

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

# Copy dist and server files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/src/utils ./src/utils
COPY --from=builder /app/src/types ./src/types
COPY --from=builder /app/tsconfig*.json ./

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["npx", "tsx", "server/index.ts"]
