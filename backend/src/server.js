require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const { waitForDatabase } = require('./db');
const ordersRouter = require('./routes/orders.routes');
const { setupSockets } = require('./sockets');
const { createRedisClient, NOTIFICATIONS_CHANNEL } = require('./config/redis');
const { UPLOAD_DIR, ensureUploadDir } = require('./config/uploads');

const PORT = Number(process.env.PORT || 3001);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

function parseOrigins(value) {
  return value.split(',').map((origin) => origin.trim()).filter(Boolean);
}

async function startServer() {
  await waitForDatabase();
  ensureUploadDir();

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: parseOrigins(CORS_ORIGIN)
    }
  });

  app.use(cors({ origin: parseOrigins(CORS_ORIGIN) }));
  app.use(express.json());
  app.use('/uploads', express.static(UPLOAD_DIR));

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'pittrack-backend',
      timestamp: new Date().toISOString()
    });
  });

  app.use('/orders', ordersRouter);

  app.use((error, req, res, next) => {
    console.error('[api] erro:', error);
    res.status(500).json({
      error: 'Erro interno no servidor.',
      details: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  });

  setupSockets(io);

  const subscriber = createRedisClient('api-live-notifications-subscriber');
  await subscriber.subscribe(NOTIFICATIONS_CHANNEL);
  console.log(`[api] escutando Pub/Sub em ${NOTIFICATIONS_CHANNEL}`);

  subscriber.on('message', (channel, message) => {
    if (channel !== NOTIFICATIONS_CHANNEL) {
      return;
    }

    try {
      const event = JSON.parse(message);
      io.emit('order-event', event);

      console.log(`[socket] evento enviado ao frontend: ${event.type} order=${event.orderId || '-'}`);
    } catch (error) {
      console.error('[api] mensagem Pub/Sub inválida:', error.message);
    }
  });

  server.listen(PORT, () => {
    console.log(`[api] PitTrack backend rodando na porta ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('[api] falha ao iniciar servidor:', error);
  process.exit(1);
});
