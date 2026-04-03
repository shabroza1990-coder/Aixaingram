const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

// --- OUR REAL CLOUD DATABASE (In-Memory) ---
const users = {}; // Tracks { email: { username, password, pfp, followers, following } }
const posts = []; // Tracks all posts globally

io.on('connection', (socket) => {
    console.log('User connected');

    // 1. REAL ACCOUNT CREATION & LOGIN
    socket.on('create_account', (data) => {
        if(users[data.email]) {
            socket.emit('auth_error', "Account already exists! Please log in.");
        } else {
            users[data.email] = {
                email: data.email,
                username: data.email.split('@')[0], 
                password: data.password,
                pfp: "",
                followers: [],
                following: []
            };
            socket.emit('auth_success', users[data.email]);
        }
    });

    socket.on('login', (data) => {
        const user = users[data.email];
        if(user && user.password === data.password) {
            socket.emit('auth_success', user);
        } else {
            socket.emit('auth_error', "Wrong email or password. Are you using the correct account?");
        }
    });

    // 2. SAVING PROFILE PICTURES
    socket.on('update_pfp', (data) => {
        if(users[data.email]) {
            users[data.email].pfp = data.pfp;
        }
    });

    // 3. GLOBAL FEED
    socket.on('new_post', (data) => {
        posts.push(data);
        io.emit('receive_post', data); // Broadcast to everyone
    });
    
    socket.on('new_reel', (data) => {
        io.emit('receive_reel', data);
    });

    // 4. REAL LIVE NOTIFICATIONS 
    socket.on('send_notification', (data) => {
        io.emit('receive_notification', data);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Live Server running on port ${PORT}`);
});
