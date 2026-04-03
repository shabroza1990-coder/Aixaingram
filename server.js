const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

const users = {}; 
const posts = []; 

io.on('connection', (socket) => {
    console.log('User connected');

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
                following: [],
                isPrivate: false // Ready for phase 2
            };
            socket.emit('auth_success', users[data.email]);
        }
    });

    socket.on('login', (data) => {
        const user = users[data.email];
        if(user && user.password === data.password) {
            socket.emit('auth_success', user);
        } else {
            socket.emit('auth_error', "Wrong email or password.");
        }
    });

    socket.on('update_pfp', (data) => {
        if(users[data.email]) users[data.email].pfp = data.pfp;
    });

    // --- NEW: LIVE SEARCH ENGINE ---
    socket.on('search_users', (query) => {
        if(!query) {
            socket.emit('search_results', []);
            return;
        }
        const results = Object.values(users)
            .filter(u => u.username.toLowerCase().includes(query.toLowerCase()))
            .map(u => ({ username: u.username, pfp: u.pfp }));
        socket.emit('search_results', results);
    });

    // --- NEW: STORY UPLOADS ---
    socket.on('new_story', (data) => {
        io.emit('receive_story', data);
    });

    socket.on('new_post', (data) => {
        posts.push(data);
        io.emit('receive_post', data); 
    });
    
    socket.on('new_reel', (data) => {
        io.emit('receive_reel', data);
    });

    socket.on('send_notification', (data) => {
        io.emit('receive_notification', data);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Live Server running on port ${PORT}`);
});
