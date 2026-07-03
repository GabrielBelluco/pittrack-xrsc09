FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY prisma/ ./prisma/
RUN npx prisma generate
COPY tsconfig.json ./
COPY src/ ./src/

CMD ["sh", "-c", "npx tsx src/server.ts"]
