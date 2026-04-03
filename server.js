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
            socket.emit('auth_error', "Account exists! Please log in.");
        } else {
            users[data.email] = {
                email: data.email, username: data.email.split('@')[0], 
                password: data.password, 
                secQuestion: data.secQuestion, 
                secAnswer: data.secAnswer.toLowerCase(), 
                pfp: "", followers: [], following: []
            };
            socket.emit('auth_success', users[data.email]);
        }
    });

    socket.on('login', (data) => {
        const user = users[data.email];
        if(user && user.password === data.password) socket.emit('auth_success', user);
        else socket.emit('auth_error', "Wrong email or password.");
    });

    socket.on('recover_password', (data) => {
        const user = users[data.email];
        if(!user) {
            socket.emit('recover_error', "Email not found in database.");
        } else if (user.secAnswer === data.answer.toLowerCase()) {
            socket.emit('recover_success', `Success! Your password is: ${user.password}`);
        } else {
            socket.emit('recover_error', "Wrong security answer. Try again.");
        }
    });

    socket.on('get_sec_question', (email) => {
        const user = users[email];
        if(user && user.secQuestion) socket.emit('receive_sec_question', user.secQuestion);
        else socket.emit('recover_error', "Email not found.");
    });

    socket.on('send_like_notification', (data) => {
        if(data.targetEmail && data.targetEmail !== data.senderEmail) {
            io.emit('receive_notification', {
                targetEmail: data.targetEmail, message: `liked your post! ❤️`,
                username: data.senderUsername, pfp: data.senderPfp
            });
        }
    });

    socket.on('update_pfp', (data) => {
        if(users[data.email]) {
            users[data.email].pfp = data.pfp;
            io.emit('pfp_updated', { email: data.email, pfp: data.pfp });
        }
    });

    socket.on('search_users', (query) => {
        if(!query) { socket.emit('search_results', []); return; }
        const results = Object.values(users)
            .filter(u => u.username.toLowerCase().includes(query.toLowerCase()))
            .map(u => ({ email: u.email, username: u.username, pfp: u.pfp }));
        socket.emit('search_results', results);
    });

    socket.on('get_profile_data', (username) => {
        const targetUser = Object.values(users).find(u => u.username === username);
        if(targetUser) {
            const userPosts = posts.filter(p => p.user === username && p.type === 'post');
            socket.emit('receive_profile_data', {
                username: targetUser.username, pfp: targetUser.pfp,
                followers: targetUser.followers.length, following: targetUser.following.length,
                postCount: userPosts.length, posts: userPosts.map(p => p.media)
            });
        }
    });

    socket.on('follow_user', (data) => {
        const targetUser = users[data.targetEmail];
        const currentUser = users[data.myEmail];
        if(targetUser && currentUser && data.targetEmail !== data.myEmail) {
            if(!targetUser.followers.includes(currentUser.username)) {
                targetUser.followers.push(currentUser.username);
                currentUser.following.push(targetUser.username);
                socket.emit('update_stats', { followers: currentUser.followers.length, following: currentUser.following.length });
                io.emit('receive_notification', { targetEmail: data.targetEmail, message: `started following you.`, username: currentUser.username, pfp: currentUser.pfp });
            }
        }
    });

    socket.on('new_story', (data) => { io.emit('receive_story', data); });
    socket.on('new_post', (data) => { data.type = 'post'; posts.push(data); io.emit('receive_post', data); });
    socket.on('new_reel', (data) => { io.emit('receive_reel', data); });
});

const PORT = process.env.PORT || 3000;
// THIS LINE IS CRITICAL FOR WINDOWS TO FIND THE SERVER:
http.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
