FROM node:18-alpine

# Install FFmpeg and build dependencies for Rhubarb
RUN apk add --no-cache ffmpeg cmake boost-dev build-base unzip

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3002

# Start the application
CMD ["npm", "start"]