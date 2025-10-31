FROM node:18-alpine
WORKDIR /app
COPY package.json ./
COPY server.js ./
COPY mock_data.js ./
COPY routes/ ./routes/
COPY utils/ ./utils/
RUN npm install
EXPOSE 3001
CMD ["npm", "start"]

