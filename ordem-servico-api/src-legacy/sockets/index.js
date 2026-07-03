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

    socket.on('disconnect', () => {
      console.log(`[socket] cliente desconectado: ${socket.id}`);
    });
  });
}

module.exports = {
  setupSockets
};
