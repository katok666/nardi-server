const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Создаем приложение и разрешаем кросс-доменные запросы (CORS)
const app = express();
app.use(cors()); 

const server = http.createServer(app);

// Настраиваем Socket.io (наши сверхбыстрые веб-сокеты)
const io = new Server(server, {
  cors: {
    origin: "*", // Разрешаем подключаться с любого адреса (в том числе с твоего Surge)
    methods: ["GET", "POST"]
  }
});

// Здесь мы будем хранить состояния всех текущих игр в оперативной памяти сервера
const rooms = {};

// Главный слушатель: срабатывает, когда кто-то открывает игру
io.on('connection', (socket) => {
  console.log(`🟢 Игрок подключился: ${socket.id}`);

  // 🚀 НОВОЕ: Игрок просит пустить его в комнату конкретного матча
  socket.on('joinRoom', (matchId) => {
    socket.join(matchId);
    console.log(`🚪 Игрок ${socket.id} зашел в комнату матча: ${matchId}`);
  });

  // 🚀 НОВОЕ: Получаем новый ход от одного игрока и рассылаем остальным в комнате
  socket.on('gameStateUpdate', ({ matchId, state }) => {
    // socket.to(matchId).emit отправляет данные всем в комнате matchId, КРОМЕ самого отправителя
    socket.to(matchId).emit('gameStateUpdate', state);
  });

  // Слушатель отключения: срабатывает, когда игрок закрывает вкладку
  socket.on('disconnect', () => {
    console.log(`🔴 Игрок отключился: ${socket.id}`);
  });
});

// Запускаем сервер на порту 3001
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Игровой сервер успешно запущен на порту ${PORT}`);
});