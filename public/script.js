const socket = io();
let currentUser = "";
let uploadMode = "post"; 
let currentFileData = null; 
let postCount = 0;
let followingCount = 0;
let userPfpData = ""; 
let followingList = []; 
let currentChatUser = ""; 

// --- AUTHENTICATION ---
function handleAuth(action) {
    const email = document.getElementById('email-input').value;
    const password = document.getElementById('password-input').value;
    const msgBox = document.getElementById('auth-msg');

    if(!email.includes('@') || password.length < 6) {
        msgBox.innerText = "Invalid credentials. Try again.";
        return;
    }

    currentUser = email.split('@')[0];
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    document.getElementById('profile-username').innerText = "@" + currentUser;
    document.getElementById('profile-realname').innerText = currentUser.toUpperCase();
    
    loadMockNetwork();
}

// --- TABS & UI ---
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active-nav'));
    document.getElementById(tabName + '-tab').classList.remove('hidden');
    document.getElementById('nav-' + tabName).classList.add('active-nav');
    closePrivateChat();
    document.getElementById('notifications-panel').classList.add('hidden'); // Close notifs on tab switch
}

function toggleNotifications() {
    const panel = document.getElementById('notifications-panel');
    panel.classList.toggle('hidden');
    document.getElementById('notif-badge').classList.add('hidden'); // Clear badge
}

function switchChatView(view) {
    document.getElementById('messages-view').classList.add('hidden');
    document.getElementById('friends-view').classList.add('hidden');
    const btns = document.querySelectorAll('.chat-tab-btn');
    btns[0].classList.remove('active');
    btns[1].classList.remove('active');

    if(view === 'messages') {
        document.getElementById('messages-view').classList.remove('hidden');
        btns[0].classList.add('active');
        renderInbox();
    } else {
        document.getElementById('friends-view').classList.remove('hidden');
        btns[1].classList.add('active');
    }
}

// --- PROFILE & SETTINGS ---
function changeProfilePic(event) {
    const file = event.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        userPfpData = e.target.result;
        document.getElementById('my-profile-pic').style.backgroundImage = `url(${userPfpData})`;
        document.getElementById('nav-pfp').style.backgroundImage = `url(${userPfpData})`;
    };
    reader.readAsDataURL(file);
}

function openSettings() {
    document.getElementById('settings-modal').classList.remove('hidden');
    document.getElementById('edit-name').value = document.getElementById('profile-realname').innerText;
    document.getElementById('edit-bio').value = document.getElementById('profile-bio').innerText;
}

function closeSettings() {
    document.getElementById('settings-modal').classList.add('hidden');
}

function saveSettings() {
    const name = document.getElementById('edit-name').value;
    const bio = document.getElementById('edit-bio').value;
    const dob = document.getElementById('edit-dob').value;

    if(name) document.getElementById('profile-realname').innerText = name;
    if(bio) document.getElementById('profile-bio').innerText = bio;
    if(dob) document.getElementById('profile-dob').innerText = "DOB: " + dob;
    
    closeSettings();
    alert("Profile Settings Updated!");
}

// --- NETWORK ---
function loadMockNetwork() {
    const list = document.getElementById('friend-list');
    const accounts = ["Alex_Pro", "Sarah_Code", "GamerX", "Tech_Guru"];
    accounts.forEach(acc => {
        list.innerHTML += `
            <div class="friend-item" data-name="${acc.toLowerCase()}">
                <div class="avatar small"></div>
                <span style="flex-grow:1; font-weight:bold;">${acc}</span>
                <button class="btn-blue" id="btn-${acc}" style="padding: 6px 15px; border-radius: 5px; border:none; cursor:pointer;" onclick="followUser('${acc}')">Follow</button>
            </div>
        `;
    });
}

function searchFriends() {
    const query = document.getElementById('friend-search').value.toLowerCase();
    document.querySelectorAll('.friend-item').forEach(item => {
        item.classList.toggle('hidden', !item.getAttribute('data-name').includes(query));
    });
}

function followUser(username) {
    const btn = document.getElementById(`btn-${username}`);
    if(!followingList.includes(username)) {
        followingList.push(username);
        followingCount++;
        btn.innerText = "Following";
        btn.style.background = "#262626";
        btn.style.color = "white";
    } else {
        followingList = followingList.filter(name => name !== username);
        followingCount--;
        btn.innerText = "Follow";
        btn.style.background = "#0095f6";
    }
    document.getElementById('stat-following').innerText = followingCount;
}

// --- DIRECT MESSAGING ---
function renderInbox() {
    const inbox = document.getElementById('inbox-list');
    inbox.innerHTML = "";
    if(followingList.length === 0) {
        inbox.innerHTML = `<p style="text-align:center; color:#555; margin-top:20px;">Follow people in your Network to message them.</p>`;
        return;
    }
    followingList.forEach(user => {
        inbox.innerHTML += `
            <div class="inbox-item" onclick="openPrivateChat('${user}')">
                <div class="avatar small"></div>
                <div style="flex-grow:1;"><div style="font-weight:bold;">${user}</div><div style="font-size:12px; color:#8e8e8e;">Tap to chat...</div></div>
            </div>
        `;
    });
}

function openPrivateChat(username) {
    currentChatUser = username;
    document.getElementById('active-private-chat').classList.remove('hidden');
    document.getElementById('chatting-with-name').innerText = username;
    document.getElementById('chat-box').innerHTML = `<p style="text-align:center; color:#8e8e8e; font-size:12px;">Direct messages with ${username}.</p>`;
}

function closePrivateChat() {
    document.getElementById('active-private-chat').classList.add('hidden');
}

function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value;
    if(text.trim() === "") return;
    const chatBox = document.getElementById('chat-box');
    chatBox.innerHTML += `<div class="message msg-self">${text}</div>`;
    chatBox.scrollTop = chatBox.scrollHeight;
    input.value = ""; 
}

// --- UPLOAD ---
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
    document.getElementById('preview-icon').classList.remove('hidden');
    document.getElementById('preview-text').classList.remove('hidden');
}

// --- POST INTERACTIONS ---
function toggleLike(icon) {
    icon.classList.toggle('fa-regular');
    icon.classList.toggle('fa-solid');
    icon.classList.toggle('liked');
}

socket.on('receive_post', (data) => {
    const feed = document.getElementById('feed-container');
    const pfpStyle = data.pfp ? `background-image: url(${data.pfp});` : '';
    const postHTML = `
        <div class="post">
            <div class="post-header"><div class="avatar small" style="${pfpStyle}"></div><span>${data.user}</span></div>
            <div class="post-media-container"><img src="${data.media}" class="post-real-image"></div>
            <div class="post-actions">
                <i class="fa-regular fa-heart action-icon" onclick="toggleLike(this)"></i>
                <i class="fa-regular fa-comment action-icon" onclick="prompt('Add a comment:')"></i>
            </div>
            <div class="post-caption"><strong>${data.user}</strong> ${data.caption}</div>
        </div>`;
    feed.innerHTML = postHTML + feed.innerHTML; 
});

socket.on('receive_reel', (data) => {
    const reelsContainer = document.getElementById('reels-container');
    const pfpStyle = data.pfp ? `background-image: url(${data.pfp}); border: 2px solid white;` : '';
    const reelHTML = `
        <div class="reel-video-box">
            <video src="${data.media}" class="real-reel-vid" autoplay loop muted controls></video>
            <div class="reel-overlay">
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                    <div class="avatar small" style="${pfpStyle}"></div>
                    <h3>@${data.user}</h3>
                </div>
                <p>${data.caption}</p>
            </div>
            <div class="reel-actions">
                <i class="fa-regular fa-heart action-icon" onclick="toggleLike(this)"></i>
                <i class="fa-regular fa-comment action-icon" onclick="prompt('Add a comment:')"></i>
            </div>
        </div>`;
    reelsContainer.innerHTML = reelHTML + reelsContainer.innerHTML;
});
