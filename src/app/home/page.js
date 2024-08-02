"use client"
import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

export default function Home() {
  const [socket, setSocket] = useState(null);
  const [userStatus, setUserStatus] = useState({
    microphone: false,
    mute: false,
    username: `user#${Math.floor(Math.random() * 999999)}`,
    online: false,
  });
  const [users, setUsers] = useState([]);

  const audioContext = useRef(null);
  const mediaRecorder = useRef(null);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.emit('userInformation', userStatus);

    newSocket.on('usersUpdate', (data) => {
      setUsers(Object.values(data));
    });

    newSocket.on('send', (audioChunks) => {
      const audio = new Audio(audioChunks);
      audio.play();
    });

    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.emit('userInformation', userStatus);
    }
  }, [userStatus, socket]);

  const toggleMicrophone = () => {
    setUserStatus((prev) => ({ ...prev, microphone: !prev.microphone }));
    if (!userStatus.microphone) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          audioContext.current = new AudioContext();
          mediaRecorder.current = new MediaRecorder(stream);
          mediaRecorder.current.start(1000);

          mediaRecorder.current.addEventListener('dataavailable', (event) => {
            if (event.data.size > 0 && socket) {
              socket.emit('voice', event.data);
            }
          });
        });
    } else {
      mediaRecorder.current?.stop();
      audioContext.current?.close();
    }
  };

  const toggleMute = () => {
    setUserStatus((prev) => ({ ...prev, mute: !prev.mute }));
  };

  const toggleConnection = () => {
    setUserStatus((prev) => ({ ...prev, online: !prev.online }));
  };

  return (
    <div>
      <h1>Voice Chat App</h1>
      <div>
        <p>Username: {userStatus.username}</p>
        <button onClick={toggleMicrophone}>
          {userStatus.microphone ? 'Turn Off Microphone' : 'Turn On Microphone'}
        </button>
        <button onClick={toggleMute}>
          {userStatus.mute ? 'Unmute' : 'Mute'}
        </button>
        <button onClick={toggleConnection}>
          {userStatus.online ? 'Go Offline' : 'Go Online'}
        </button>
      </div>
      <h2>Online Users</h2>
      <ul>
        {users.map((user, index) => (
          <li key={index}>{user.username} - {user.online ? 'Online' : 'Offline'}</li>
        ))}
      </ul>
    </div>
  );
}