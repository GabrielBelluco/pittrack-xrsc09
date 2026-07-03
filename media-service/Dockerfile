FROM node:20-alpine

WORKDIR /app

RUN mkdir -p src/uploads

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src/ ./src/

EXPOSE 3003

CMD ["npx", "tsx", "src/server.ts"]
