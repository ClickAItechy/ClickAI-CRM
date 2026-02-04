FROM node:20-alpine

WORKDIR /app

# Install Angular CLI globally
RUN npm install -g @angular/cli@17

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy project files
COPY . .

# Expose port
EXPOSE 4200

# Start in Dev mode (live-reload disabled to prevent random refreshes from volume sync)
CMD ["ng", "serve", "--host", "0.0.0.0", "--disable-host-check", "--live-reload=false"]
