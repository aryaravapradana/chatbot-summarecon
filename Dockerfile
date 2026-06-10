FROM ghcr.io/puppeteer/puppeteer:latest

# We need to run as root to copy files and install packages
USER root

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Change ownership to the built-in non-root puppeteer user for security
RUN chown -R pptruser:pptruser /app

# Switch to the non-root user
USER pptruser

# Expose the web dashboard port
EXPOSE 3000

# Start the bot
CMD ["npm", "start"]
