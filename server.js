const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const socketIo = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = socketIo(server);

  const socketsStatus = {};

  io.on('connection', (socket) => {
    const socketId = socket.id;
    socketsStatus[socketId] = {};

    console.log('A user connected');

    socket.on('voice', (data) => {
      const newData = data.split(';');
      newData[0] = 'data:audio/ogg;';
      const audioData = newData[0] + newData[1];

      for (const id in socketsStatus) {
        if (id !== socketId && !socketsStatus[id].mute && socketsStatus[id].online) {
          socket.broadcast.to(id).emit('send', audioData);
        }
      }
    });

    socket.on('userInformation', (data) => {
      socketsStatus[socketId] = data;
      io.sockets.emit('usersUpdate', socketsStatus);
    });

    socket.on('disconnect', () => {
      delete socketsStatus[socketId];
      console.log('A user disconnected');
    });
  });

  server.listen(3000, (err) => {
    if (err) throw err;
    console.log('> Ready on http://localhost:3000');
  });
});