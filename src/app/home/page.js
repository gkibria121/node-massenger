"use client"
import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

export default function Home() {
  const [socket, setSocket] = useState(null);
  const [userStatus, setUserStatus] = useState({
    microphone: false,
    mute: false,
    username: '',
    online: false,
  });
  const [users, setUsers] = useState([]);

  const audioContext = useRef(null);
  const mediaRecorder = useRef(null);

  useEffect(() => {
    const newSocket = io(); // No need to specify URL, it will use the same domain
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

  // Generate username only on the client side
  useEffect(() => {
    const username = `user#${Math.floor(Math.random() * 999999)}`;
    setUserStatus((prev) => ({ ...prev, username }));
  }, []);

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
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-8">Voice Chat App</h1>
      <div className="bg-white p-8 rounded-lg shadow-lg w-80 text-center">
        <p className="text-lg mb-4">Username: {userStatus.username}</p>
        <div className="space-y-4 space-x-2">
          <button
            className={`px-4 py-2 rounded text-white ${userStatus.microphone ? 'bg-red-500' : 'bg-green-500'}`}
            onClick={toggleMicrophone}
          >
            {userStatus.microphone ? 'Turn Off Microphone' : 'Turn On Microphone'}
          </button>
          <button
            className={`px-4 py-2 rounded text-white ${userStatus.mute ? 'bg-red-500' : 'bg-green-500'}`}
            onClick={toggleMute}
          >
            {userStatus.mute ? 'Unmute' : 'Mute'}
          </button>
          <button
            className={`px-4 py-2 rounded text-white ${userStatus.online ? 'bg-red-500' : 'bg-green-500'}`}
            onClick={toggleConnection}
          >
            {userStatus.online ? 'Go Offline' : 'Go Online'}
          </button>
        </div>
      </div>
      <h2 className="text-2xl font-bold mt-8">Online Users</h2>
      <ul className="mt-4 space-y-2">
        {users.map((user, index) => (
          <li key={index} className="bg-white p-4 rounded-lg shadow-md w-80 text-center">
            {user.username} - {user.online ? 'Online' : 'Offline'}
          </li>
        ))}
      </ul>
    </div>
  );
}
