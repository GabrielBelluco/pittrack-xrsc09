function setupSockets(io) {
  io.on('connection', (socket) => {
    console.log(`[socket] cliente conectado: ${socket.id}`);

    socket.emit('socket-ready', {
      socketId: socket.id,
      message: 'Conectado ao painel em tempo real do PitTrack.'
    });

    socket.on('join-order', (orderId) => {
      socket.join(`order:${orderId}`);
      console.log(`[socket] ${socket.id} acompanhando ordem ${orderId}`);
    });

    socket.on('live-join', ({ orderId, role }) => {
      if (!orderId) {
        return;
      }

      socket.join(`live:${orderId}`);
      socket.data.liveOrderId = orderId;
      socket.data.liveRole = role || 'cliente';

      socket.to(`live:${orderId}`).emit('live-peer-joined', {
        orderId,
        socketId: socket.id,
        role: socket.data.liveRole
      });

      console.log(`[socket] ${socket.id} entrou na live da ordem ${orderId} como ${socket.data.liveRole}`);
    });

    socket.on('live-offer', (message) => {
      socket.to(`live:${message.orderId}`).emit('live-offer', {
        ...message,
        from: socket.id
      });
    });

    socket.on('live-answer', (message) => {
      socket.to(`live:${message.orderId}`).emit('live-answer', {
        ...message,
        from: socket.id
      });
    });

    socket.on('live-ice-candidate', (message) => {
      socket.to(`live:${message.orderId}`).emit('live-ice-candidate', {
        ...message,
        from: socket.id
      });
    });

    socket.on('live-leave', ({ orderId }) => {
      if (!orderId) {
        return;
      }

      socket.leave(`live:${orderId}`);
      socket.to(`live:${orderId}`).emit('live-peer-left', {
        orderId,
        socketId: socket.id
      });
    });

    socket.on('disconnect', () => {
      if (socket.data.liveOrderId) {
        socket.to(`live:${socket.data.liveOrderId}`).emit('live-peer-left', {
          orderId: socket.data.liveOrderId,
          socketId: socket.id
        });
      }

      console.log(`[socket] cliente desconectado: ${socket.id}`);
    });
  });
}

module.exports = {
  setupSockets
};
