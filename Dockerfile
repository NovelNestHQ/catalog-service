# Use Node.js LTS image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN yarn install

# Copy the rest of the application
COPY . .

# Install TypeScript and nodemon globally for development
RUN yarn global add ts-node nodemon

# Expose port for the API
EXPOSE 4000

# Start the app in dev mode with nodemon
CMD ["nodemon", "--exec", "yarn run dev", "--watch", "./src", "--ext", ".ts"]

