const { io } = require('socket.io-client');

const TOKEN = process.argv[2]; // pass token as first arg
const CONVERSATION_ID = process.argv[3]; // pass conversation id as second arg

const socket = io('http://localhost:3000', { auth: { token: TOKEN } });

socket.on('connect', () => console.log('✅ connected as', socket.id));

socket.on('call:incoming', (data) => {
  console.log('📞 INCOMING CALL:', data);
  console.log('   → to accept, type: accept <callId>');
});

socket.on('call:participant-updated', (data) =>
  console.log('🔄 participant update:', data),
);
socket.on('call:participant-left', (data) =>
  console.log('👋 participant left:', data),
);

// simple command-line input so you can trigger actions manually
const readline = require('readline').createInterface({ input: process.stdin });
readline.on('line', (line) => {
  const [cmd, callId] = line.trim().split(' ');
  if (cmd === 'call') {
    socket.emit('call:initiate', { conversationId: CONVERSATION_ID }, (res) =>
      console.log('call started:', res),
    );
  } else if (cmd === 'accept') {
    socket.emit(
      'call:accept',
      { callId, conversationId: CONVERSATION_ID },
      (res) => console.log('accepted:', res),
    );
  } else if (cmd === 'decline') {
    socket.emit(
      'call:decline',
      { callId, conversationId: CONVERSATION_ID },
      (res) => console.log('declined:', res),
    );
  } else if (cmd === 'leave') {
    socket.emit(
      'call:leave',
      { callId, conversationId: CONVERSATION_ID },
      (res) => console.log('left:', res),
    );
  }
});
