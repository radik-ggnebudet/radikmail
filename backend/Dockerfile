FROM node:20-alpine

# Нужен для better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json .
RUN npm install --production

COPY . .

# Создаём папку для данных
RUN mkdir -p /data

EXPOSE 3000 25

CMD ["sh", "-c", "node src/setup.js && node src/index.js"]
