const socket = io();
let currentUser = "";
let currentEmail = "";
let uploadMode = "post"; 
let currentFileData = null; 
let postCount = 0;
let userPfpData = ""; 

function handleAuth(action) {
    const email = document.getElementById('email-input').value;
    const password = document.getElementById('password-input').value;
    const msgBox = document.getElementById('auth-msg');

    if(!email.includes('@') || password.length < 6) {
        msgBox.innerText = "Invalid email or password is too short.";
        return;
    }
    if(action === 'create') {
        socket.emit('create_account', { email: email, password: password });
    } else {
        socket.emit('login', { email: email, password: password });
    }
}

socket.on('auth_error', (msg) => { document.getElementById('auth-msg').innerText = msg; });

socket.on('auth_success', (userData) => {
    currentUser = userData.username;
    currentEmail = userData.email;
    userPfpData = userData.pfp;
    
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    
    document.getElementById('profile-username').innerText = "@" + currentUser;
    document.getElementById('profile-realname').innerText = currentUser.toUpperCase();

    if(userPfpData) {
        document.getElementById('my-profile-pic').style.backgroundImage = `url(${userPfpData})`;
        document.getElementById('nav-pfp').style.backgroundImage = `url(${userPfpData})`;
    }
});

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active-nav'));
    document.getElementById(tabName + '-tab').classList.remove('hidden');
    document.getElementById('nav-' + tabName).classList.add('active-nav');
    document.getElementById('notifications-panel').classList.add('hidden');
}

function switchChatView(view) {
    document.getElementById('messages-view').classList.add('hidden');
    document.getElementById('friends-view').classList.add('hidden');
    document.querySelectorAll('.chat-tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(view + '-view').classList.remove('hidden');
    event.target.classList.add('active');
}

function toggleNotifications() {
    document.getElementById('notifications-panel').classList.toggle('hidden');
    document.getElementById('notif-badge').classList.add('hidden');
}

// --- NEW: SEARCH ENGINE LOGIC ---
function executeSearch() {
    const query = document.getElementById('friend-search').value;
    socket.emit('search_users', query);
}

socket.on('search_results', (results) => {
    const list = document.getElementById('search-results-list');
    list.innerHTML = "";
    if(results.length === 0) {
        list.innerHTML = `<p style="padding:20px; color:#555;">No users found.</p>`;
        return;
    }
    results.forEach(user => {
        const pfpStyle = user.pfp ? `background-image: url(${user.pfp});` : '';
        list.innerHTML += `
            <div class="search-result-item">
                <div class="avatar small" style="${pfpStyle}"></div>
                <span><strong>${user.username}</strong></span>
            </div>
        `;
    });
});

// --- NEW: STORY UPLOAD LOGIC ---
function uploadStory(event) {
    const file = event.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const storyData = e.target.result;
        socket.emit('new_story', { user: currentUser, pfp: userPfpData, image: storyData });
        alert("Story Uploaded Successfully!");
    };
    reader.readAsDataURL(file);
}

socket.on('receive_story', (data) => {
    const storyBar = document.getElementById('story-bar');
    const pfpStyle = data.image ? `background-image: url(${data.image});` : '';
    storyBar.innerHTML += `
        <div class="story-bubble has-story" style="${pfpStyle}" onclick="alert('Viewing ${data.user}\\n(Story viewer UI coming soon!)')">
            <p>${data.user}</p>
        </div>
    `;
});

function changeProfilePic(event) {
    const file = event.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        userPfpData = e.target.result;
        document.getElementById('my-profile-pic').style.backgroundImage = `url(${userPfpData})`;
        document.getElementById('nav-pfp').style.backgroundImage = `url(${userPfpData})`;
        socket.emit('update_pfp', { email: currentEmail, pfp: userPfpData });
    };
    reader.readAsDataURL(file);
}

function toggleUploadType(type) {
    uploadMode = type;
    document.getElementById('btn-post').classList.remove('active');
    document.getElementById('btn-reel').classList.remove('active');
    document.getElementById('btn-' + type).classList.add('active');
    document.getElementById('media-upload').accept = type === 'post' ? "image/*" : "video/*";
}

function loadGallery(event) {
    const file = event.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        currentFileData = e.target.result;
        document.getElementById('preview-icon').classList.add('hidden');
        document.getElementById('preview-text').classList.add('hidden');
        if(uploadMode === 'post') {
            document.getElementById('image-preview').src = currentFileData;
            document.getElementById('image-preview').classList.remove('hidden');
            document.getElementById('video-preview').classList.add('hidden');
        } else {
            document.getElementById('video-preview').src = currentFileData;
            document.getElementById('video-preview').classList.remove('hidden');
            document.getElementById('image-preview').classList.add('hidden');
        }
    };
    reader.readAsDataURL(file);
}

function publishMedia() {
    if(!currentFileData) { alert("Please select a photo/video!"); return; }
    const caption = document.getElementById('post-caption').value;
    if(uploadMode === "post") {
        socket.emit('new_post', { user: currentUser, caption: caption, media: currentFileData, pfp: userPfpData });
        document.getElementById('my-profile-grid').innerHTML += `<div class="grid-item"><img src="${currentFileData}"></div>`;
        postCount++;
        document.getElementById('stat-posts').innerText = postCount;
        switchTab('feed');
    } else {
        socket.emit('new_reel', { user: currentUser, caption: caption, media: currentFileData, pfp: userPfpData });
        switchTab('reels');
    }
    currentFileData = null;
    document.getElementById('post-caption').value = "";
    document.getElementById('image-preview').classList.add('hidden');
    document.getElementById('video-preview').classList.add('hidden');
}

socket.on('receive_post', (data) => {
    const feed = document.getElementById('feed-container');
    const pfpStyle = data.pfp ? `background-image: url(${data.pfp});` : '';
    feed.innerHTML = `
        <div class="post">
            <div class="post-header"><div class="avatar small" style="${pfpStyle}"></div><span>${data.user}</span></div>
            <div class="post-media-container"><img src="${data.media}" class="post-real-image"></div>
            <div class="post-actions"><i class="fa-regular fa-heart action-icon" onclick="this.classList.toggle('fa-solid'); this.classList.toggle('liked');"></i></div>
            <div class="post-caption"><strong>${data.user}</strong> ${data.caption}</div>
        </div>` + feed.innerHTML; 
});

socket.on('receive_reel', (data) => {
    const reelsContainer = document.getElementById('reels-container');
    reelsContainer.innerHTML += `
        <div class="reel-video-box">
            <video class="real-reel-vid" src="${data.media}" autoplay loop muted playsinline></video>
            <div class="reel-overlay"><strong>@${data.user}</strong><p>${data.caption}</p></div>
        </div>
    `;
});
