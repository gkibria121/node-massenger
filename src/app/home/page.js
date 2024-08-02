"use client"
import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const socketUrl = 'http://localhost:3001'; // Replace with your backend server URL

export default function Home() {
  const [socket, setSocket] = useState(null);
  const [userStatus, setUserStatus] = useState({
    microphone: false,
    mute: false,
    username: '',
    online: false,
  });
  const [users, setUsers] = useState([]);
  const [volume, setVolume] = useState(1);

  const audioContextRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const gainNodeRef = useRef(null);

  const audioBuffers = [];
  const bufferSize = 5;  // Adjust based on your needs

  useEffect(() => {
    const newSocket = io(socketUrl);  
    setSocket(newSocket);

    newSocket.emit('userInformation', userStatus);

    newSocket.on('usersUpdate', (data) => {
      setUsers(Object.values(data));
    });

    newSocket.on('send', (audioChunks) => {
      audioBuffers.push(audioChunks);
      if (audioBuffers.length >= bufferSize) {
        const bufferedAudio = new Blob(audioBuffers, { type: 'audio/webm;codecs=opus' });
        playReceivedAudio(bufferedAudio);
        audioBuffers.length = 0;
      }
    });

    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.emit('userInformation', userStatus);
    }
  }, [userStatus, socket]);

  useEffect(() => {
    const username = `user#${Math.floor(Math.random() * 999999)}`;
    setUserStatus((prev) => ({ ...prev, username }));
  }, []);

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.setValueAtTime(volume, audioContextRef.current.currentTime);
    }
  }, [volume]);

  const playReceivedAudio = async (audioChunks) => {
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
    }

    try {
        const blob = new Blob([audioChunks], { type: 'audio/webm;codecs=opus' });
        console.log('Blob size:', blob.size);
        const arrayBuffer = await blob.arrayBuffer();
        console.log('ArrayBuffer byteLength:', arrayBuffer.byteLength);

        // Add detailed log for the first few bytes of the ArrayBuffer
        console.log('ArrayBuffer first few bytes:', new Uint8Array(arrayBuffer).slice(0, 20));

        const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        source.start();
    } catch (error) {
        console.error('Error playing received audio:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        if (error.stack) console.error('Error stack:', error.stack);
    }
};

  
  const toggleMicrophone = async () => {
    setUserStatus((prev) => ({ ...prev, microphone: !prev.microphone }));

    if (!userStatus.microphone) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
          } 
        });
        streamRef.current = stream;

        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: 48000,
          });
        }

        // if (!gainNodeRef.current) {
        //   gainNodeRef.current = audioContextRef.current.createGain();
        //   gainNodeRef.current.connect(audioContextRef.current.destination);
        // }

        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';

        mediaRecorderRef.current = new MediaRecorder(stream, {
          mimeType: mimeType,
          bitsPerSecond: 128000
        });

        mediaRecorderRef.current.start(100);

        mediaRecorderRef.current.addEventListener('dataavailable', (event) => {
          if (event.data.size > 0 && socket) {
            socket.emit('voice', event.data);
          }
        });

        mediaRecorderRef.current.addEventListener('error', (error) => {
          console.error('MediaRecorder error:', error);
        });

        // Setup local audio monitoring
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(gainNodeRef.current);

      } catch (err) {
        console.error("Error accessing media devices:", err);
      }
    } else {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      streamRef.current = null;
    }
  };

  const toggleMute = () => {
    setUserStatus((prev) => ({ ...prev, mute: !prev.mute }));
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !userStatus.mute;
      });
    }
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
        <div className="mt-4">
          <label htmlFor="volume" className="block text-sm font-medium text-gray-700">
            Volume
          </label>
          <input
            type="range"
            id="volume"
            name="volume"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="mt-1 block w-full"
          />
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
