const express = require('express');
const app = express();
const http = require('http').createServer(app);
// Increase limit so the server can handle image/video data
const io = require('socket.io')(http, { maxHttpBufferSize: 1e8 }); 

app.use(express.static('public'));
app.use(express.json({limit: '50mb'}));

io.on('connection', (socket) => {
    console.log('User connected: ' + socket.id);

    // Handle Square Feed Posts (Images)
    socket.on('new_post', (postData) => {
        io.emit('receive_post', postData);
    });

    // Handle Reels (Videos)
    socket.on('new_reel', (reelData) => {
        io.emit('receive_reel', reelData);
    });

    // Handle Chats
    socket.on('send_message', (msgData) => {
        io.emit('receive_message', msgData);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected: ' + socket.id);
    });
});

const PORT = 3000;
http.listen(PORT, () => {
    console.log(`🚀 Aixain Social running on http://localhost:${PORT}`);
});
