# Build stage
FROM node:20 AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM public.ecr.aws/lambda/nodejs:20

# Install sharp for the production image
RUN npm install --arch=x64 --platform=linux sharp

WORKDIR ${LAMBDA_TASK_ROOT}

# Copy only the necessary files from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.env.local ./
COPY --from=builder /app/.env.local.internal ./

# Set environment variables
ENV NODE_ENV=production

# Set the CMD to your handler
CMD [ "dist/src/lambda.handler" ]