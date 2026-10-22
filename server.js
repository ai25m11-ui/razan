const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Serve static files
app.use(express.static(path.join(__dirname)));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// ======= ROOMS MANAGEMENT =======
const rooms = {}; // { code: { players: [socket1, socket2], state: {...} } }

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return rooms[code] ? generateCode() : code;
}

io.on('connection', (socket) => {
  console.log(`[+] Connected: ${socket.id}`);

  // ─── CREATE ROOM ───
  socket.on('create_room', ({ playerName }) => {
    const code = generateCode();
    rooms[code] = {
      code,
      players: [{ id: socket.id, name: playerName || 'لاعب 1', color: 'w' }],
      gameStarted: false,
      moveCount: 0,
    };
    socket.join(code);
    socket.roomCode = code;
    socket.playerColor = 'w';
    socket.emit('room_created', { code, color: 'w' });
    console.log(`[ROOM] Created: ${code} by ${socket.id}`);
  });

  // ─── JOIN ROOM ───
  socket.on('join_room', ({ code, playerName }) => {
    const upper = (code || '').toUpperCase().trim();
    const room = rooms[upper];

    if (!room) {
      socket.emit('room_error', { msg: 'الغرفة غير موجودة! تحقق من الكود.' });
      return;
    }
    if (room.players.length >= 2) {
      socket.emit('room_error', { msg: 'الغرفة ممتلئة! جرب غرفة أخرى.' });
      return;
    }
    if (room.gameStarted) {
      socket.emit('room_error', { msg: 'اللعبة بدأت بالفعل!' });
      return;
    }

    room.players.push({ id: socket.id, name: playerName || 'لاعب 2', color: 'b' });
    socket.join(upper);
    socket.roomCode = upper;
    socket.playerColor = 'b';
    room.gameStarted = true;

    const [p1, p2] = room.players;

    // Notify player 1 (white)
    io.to(p1.id).emit('game_start', {
      yourColor: 'w',
      opponentName: p2.name,
      roomCode: upper,
    });

    // Notify player 2 (black)
    io.to(p2.id).emit('game_start', {
      yourColor: 'b',
      opponentName: p1.name,
      roomCode: upper,
    });

    console.log(`[ROOM] ${upper}: Game started between ${p1.name} and ${p2.name}`);
  });

  // ─── MOVE MADE ───
  socket.on('move_made', (moveData) => {
    const code = socket.roomCode;
    if (!code || !rooms[code]) return;
    rooms[code].moveCount++;
    // Broadcast to the other player in the room
    socket.to(code).emit('opponent_move', moveData);
    console.log(`[MOVE] ${code}: ${moveData.notation || '?'}`);
  });

  // ─── GAME OVER ───
  socket.on('game_over', (data) => {
    const code = socket.roomCode;
    if (!code || !rooms[code]) return;
    socket.to(code).emit('game_over_notify', data);
  });

  // ─── OFFER DRAW / RESIGN ───
  socket.on('offer_draw', () => {
    const code = socket.roomCode;
    if (code) socket.to(code).emit('draw_offered');
  });
  socket.on('accept_draw', () => {
    const code = socket.roomCode;
    if (code) io.to(code).emit('game_draw');
  });
  socket.on('resign', () => {
    const code = socket.roomCode;
    if (code) socket.to(code).emit('opponent_resigned');
  });

  // ─── CHAT ───
  socket.on('chat_msg', ({ text }) => {
    const code = socket.roomCode;
    if (!code) return;
    const room = rooms[code];
    const player = room?.players.find(p => p.id === socket.id);
    io.to(code).emit('chat_msg', {
      sender: player?.name || 'لاعب',
      color: socket.playerColor,
      text: (text || '').substring(0, 150),
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    });
  });

  // ─── DISCONNECT ───
  socket.on('disconnect', () => {
    console.log(`[-] Disconnected: ${socket.id}`);
    const code = socket.roomCode;
    if (!code || !rooms[code]) return;
    const room = rooms[code];
    // Notify remaining player
    socket.to(code).emit('player_disconnected', {
      msg: 'انقطع اتصال الخصم! 😢'
    });
    // Remove room
    delete rooms[code];
    console.log(`[ROOM] ${code}: Removed (disconnect)`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🌊 شطرنج البحر العميق - السيرفر يعمل`);
  console.log(`🔗 افتح المتصفح على: http://localhost:${PORT}\n`);
});
