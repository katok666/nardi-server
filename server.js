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
    origin: "*", // Разрешаем подключаться с любого адреса
    methods: ["GET", "POST"]
  }
});

// 🚀 НОВЫЕ БАЗЫ ДАННЫХ В ПАМЯТИ СЕРВЕРА
const playerRooms = {}; // Запоминаем, какой сокет в какой комнате (socket.id -> matchId)
const disconnectTimeouts = {}; // Храним таймеры отсчета 30 секунд (matchId -> timeout)

// Главный слушатель: срабатывает, когда кто-то открывает игру
io.on('connection', (socket) => {
  console.log(`🟢 Игрок подключился: ${socket.id}`);

  // Игрок просит пустить его в комнату конкретного матча
  socket.on('joinRoom', (matchId) => {
    socket.join(matchId);
    
    // Записываем игрока в "блокнот"
    playerRooms[socket.id] = matchId;
    console.log(`🚪 Игрок ${socket.id} зашел в комнату матча: ${matchId}`);
    
    // Мгновенно кричим создателю, что мы зашли (наш Будильник!)
    socket.to(matchId).emit('wakeUpCreator'); 

    // 🚀 НОВОЕ: Если игрок вернулся, отменяем таймер технического поражения!
    if (disconnectTimeouts[matchId]) {
      clearTimeout(disconnectTimeouts[matchId]);
      delete disconnectTimeouts[matchId];
      console.log(`⏱ Отмена таймера для ${matchId}, беглец вернулся!`);
      socket.to(matchId).emit('opponentReconnected'); // Говорим второму, что оппонент вернулся
    }
  });

  // Получаем новый ход от одного игрока и рассылаем остальным в комнате
  socket.on('gameStateUpdate', ({ matchId, state }) => {
    socket.to(matchId).emit('gameStateUpdate', state);
  });

  // 🚀 НОВОЕ: Умный слушатель отключения
  socket.on('disconnect', () => {
    console.log(`🔴 Игрок отключился: ${socket.id}`);
    
    // Ищем, в какой комнате сидел этот игрок
    const matchId = playerRooms[socket.id];

    if (matchId) {
      console.log(`⚠️ Игрок выпал из комнаты ${matchId}. Запускаем таймер 30 сек...`);
      
      // Предупреждаем оставшегося игрока, что его оппонент отвалился
      socket.to(matchId).emit('opponentDisconnected');

      // Заводим будильник на 30 секунд (30000 миллисекунд)
      disconnectTimeouts[matchId] = setTimeout(() => {
        console.log(`🏆 Время вышло! Техническая победа в комнате ${matchId}`);
        // Объявляем техническую победу
        io.to(matchId).emit('technicalVictory');
        delete disconnectTimeouts[matchId];
      }, 30000);

      // Вычеркиваем старый ID сокета из блокнота
      delete playerRooms[socket.id];
    }
  });
});

// Запускаем сервер на порту 3001
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Игровой сервер успешно запущен на порту ${PORT}`);
});
