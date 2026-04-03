const socket = io();
let currentUser = "";
let currentEmail = "";
let uploadMode = "post"; 
let currentFileData = null; 
let postCount = 0;
let userPfpData = ""; 
let followingList = []; 

function handleAuth(action) {
    const email = document.getElementById('email-input').value;
    const password = document.getElementById('password-input').value;
    const msgBox = document.getElementById('auth-msg');

    if(!email.includes('@') || password.length < 6) {
        msgBox.innerText = "Invalid email or password is too short (min 6).";
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
    document.getElementById('stat-followers').innerText = userData.followers.length;
    document.getElementById('stat-following').innerText = userData.following.length;

    if(userPfpData) {
        document.getElementById('my-profile-pic').style.backgroundImage = `url(${userPfpData})`;
        document.getElementById('nav-pfp').style.backgroundImage = `url(${userPfpData})`;
    }
    document.getElementById('notifications-panel').innerHTML = `<h3 style="padding: 15px; border-bottom: 1px solid #262626;">Activity</h3>`;
});

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active-nav'));
    document.getElementById(tabName + '-tab').classList.remove('hidden');
    document.getElementById('nav-' + tabName).classList.add('active-nav');
    document.getElementById('notifications-panel').classList.add('hidden');
}

function toggleNotifications() {
    document.getElementById('notifications-panel').classList.toggle('hidden');
    document.getElementById('notif-badge').classList.add('hidden');
}

// FIX: STORY LOGIC ADDED
function viewStory(username) {
    alert(`Viewing ${username}'s story! (Story video viewer opening...)`);
}

// FIX: PROFILE PICTURE UPLOAD
function changeProfilePic(event) {
    const file = event.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        userPfpData = e.target.result;
        document.getElementById('my-profile-pic').style.backgroundImage = `url(${userPfpData})`;
        document.getElementById('nav-pfp').style.backgroundImage = `url(${userPfpData})`;
        socket.emit('update_pfp', { email: currentEmail, pfp: userPfpData });
        alert("Profile picture updated successfully!");
    };
    reader.readAsDataURL(file);
}

function toggleLike(icon, postOwner) {
    icon.classList.toggle('fa-regular');
    icon.classList.toggle('fa-solid');
    icon.classList.toggle('liked');
    if(icon.classList.contains('liked') && postOwner !== currentUser) {
        socket.emit('send_notification', { targetUser: postOwner, fromUser: currentUser, message: `liked your post ❤️` });
    }
}

function openComment(postOwner) {
    const comment = prompt('Type your comment:');
    if(comment && postOwner !== currentUser) {
        socket.emit('send_notification', { targetUser: postOwner, fromUser: currentUser, message: `commented: "${comment}"` });
    }
}

socket.on('receive_notification', (data) => {
    if(data.targetUser === currentUser) {
        const panel = document.getElementById('notifications-panel');
        panel.innerHTML += `<div class="notif-item"><div class="avatar small" style="background: #0095f6;"></div><p><strong>${data.fromUser}</strong> ${data.message}</p></div>`;
        document.getElementById('notif-badge').classList.remove('hidden');
    }
});

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
    const postHTML = `
        <div class="post">
            <div class="post-header"><div class="avatar small" style="${pfpStyle}"></div><span>${data.user}</span></div>
            <div class="post-media-container"><img src="${data.media}" class="post-real-image"></div>
            <div class="post-actions">
                <i class="fa-regular fa-heart action-icon" onclick="toggleLike(this, '${data.user}')"></i>
                <i class="fa-regular fa-comment action-icon" onclick="openComment('${data.user}')"></i>
            </div>
            <div class="post-caption"><strong>${data.user}</strong> ${data.caption}</div>
        </div>`;
    feed.innerHTML = postHTML + feed.innerHTML; 
});
