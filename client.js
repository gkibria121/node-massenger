const socket = io();

// Chat functionality
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const messages = document.getElementById('messages');

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (chatInput.value) {
    socket.emit('chat message', chatInput.value);
    chatInput.value = '';
  }
});

socket.on('chat message', (msg) => {
  const li = document.createElement('li');
  li.textContent = msg;
  messages.appendChild(li);
});

// Video call functionality
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const startCallButton = document.getElementById('start-call');

let localStream;
let peer;

async function startVideoCall() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;

    peer = new SimplePeer({ initiator: true, stream: localStream });

    peer.on('signal', (data) => {
      socket.emit('video-signal', { signal: data, to: socket.id });
    });

    peer.on('stream', (stream) => {
      remoteVideo.srcObject = stream;
    });

    socket.on('video-signal', (data) => {
      peer.signal(data.signal);
    });
  } catch (error) {
    console.error('Error starting video call:', error);
  }
}

startCallButton.addEventListener('click', startVideoCall);