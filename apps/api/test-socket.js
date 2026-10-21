// test-socket.js — run with: node test-socket.js
const { io } = require('socket.io-client');

const socket = io('http://localhost:3000', {
  auth: {
    token:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmNDIzYTc3NC0yZjFmLTQwNGUtOWQxMC1iZGRlNTdlOTAxMjUiLCJlbWFpbCI6InZlbmRvcjJAcGxhbmFtLnRlc3QiLCJyb2xlIjoiVkVORE9SIiwiaWF0IjoxNzkxMzYxNTU5LCJleHAiOjE3OTE5NjYzNTl9.RbfFnRgrqsy7C3ndNMJVAe1IyVTKEq_G57xt4CpuaWo',
  },
});

//emit conversation read
socket.on('connect', () => {
  console.log('connected:', socket.id);

  // Mark the conversation as read
  socket.emit('conversation:read', {
    conversationId: 'bf4ddad6-eb84-4f5a-9e28-080c71f99d38',
  });
});

socket.on('conversation:read', (data) => {
  console.log('conversation read:', data);
});

socket.on('presence:online', (data) => {
  console.log('online:', data);
});

socket.on('message:new', (msg) => {
  console.log('new message:', msg);
});

//send a new message
/*
socket.on('connect', () => console.log('connected:', socket.id));
socket.on('message:new', (msg) => console.log('new message:', msg));
socket.on('presence:online', (data) => console.log('online:', data));

// after connecting, send a message:
setTimeout(() => {
  socket.emit('message:send', {
    conversationId: 'bf4ddad6-eb84-4f5a-9e28-080c71f99d38',
    // content: 'new test for socket.io',
  });
}, 1000);
*/
