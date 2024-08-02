// pages/api/socket.js
import { Server } from 'socket.io';

const socketsStatus = {};

export default function handler(req, res) {
  if (!res.socket.server.io) {
    console.log('Initializing Socket.io');
    const io = new Server(res.socket.server);
    res.socket.server.io = io;

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
  }
  res.end();
}
