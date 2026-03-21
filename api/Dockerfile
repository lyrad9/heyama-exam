FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy lock and package files
COPY pnpm-lock.yaml package.json ./

# Install dependencies (equivalent to npm ci)
RUN pnpm install --frozen-lockfile

# Copy the rest of the code and build
COPY . .
RUN pnpm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

RUN npm install -g pnpm

# Only install production dependencies
COPY pnpm-lock.yaml package.json ./
RUN pnpm install --prod --frozen-lockfile

# Copy build output from the builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
