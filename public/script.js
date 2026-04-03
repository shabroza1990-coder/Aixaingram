
const socket = io();
let currentUser = ""; let currentEmail = "";
let uploadMode = "post"; let currentFileData = null; 
let postCount = 0; let userPfpData = ""; let storyTimeout;
let unreadNotifs = 0;
let isLoginMode = true;

function toggleSignupMode() {
    isLoginMode = !isLoginMode;
    if(isLoginMode) {
        document.getElementById('auth-main-btn').innerText = "Log In";
        document.getElementById('auth-toggle-btn').innerText = "Create Secure Account";
        document.getElementById('signup-extras').classList.add('hidden');
    } else {
        document.getElementById('auth-main-btn').innerText = "Sign Up";
        document.getElementById('auth-toggle-btn').innerText = "Back to Log In";
        document.getElementById('signup-extras').classList.remove('hidden');
    }
}

function handleAuth() {
    const email = document.getElementById('email-input').value.trim();
    const password = document.getElementById('password-input').value;
    const msgBox = document.getElementById('auth-msg');

    const strictEmailFormat = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if(!strictEmailFormat.test(email)) { msgBox.innerText = "Error: Invalid Email Format."; return; }
    if(password.length < 6) { msgBox.innerText = "Error: Password must be at least 6 chars."; return; }

    if(!isLoginMode) {
        const secQ = document.getElementById('sec-question').value;
        const secA = document.getElementById('sec-answer').value;
        if(!secQ || !secA) { msgBox.innerText = "Error: Security Question & Answer required."; return; }
        socket.emit('create_account', { email: email, password: password, secQuestion: secQ, secAnswer: secA });
    } else {
        socket.emit('login', { email: email, password: password });
    }
}

socket.on('auth_error', (msg) => { document.getElementById('auth-msg').innerText = msg; });

socket.on('auth_success', (userData) => {
    currentUser = userData.username; currentEmail = userData.email; userPfpData = userData.pfp;
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
});

function openForgot() { document.getElementById('forgot-modal').classList.remove('hidden'); }
function closeForgot() { 
    document.getElementById('forgot-modal').classList.add('hidden'); 
    document.getElementById('recover-step-2').classList.add('hidden');
    document.getElementById('recover-msg').innerText = "";
}

function fetchSecQuestion() {
    const email = document.getElementById('recover-email').value;
    socket.emit('get_sec_question', email);
}

socket.on('receive_sec_question', (question) => {
    document.getElementById('recover-step-2').classList.remove('hidden');
    document.getElementById('recover-question-text').innerText = "Security Question: " + question;
});
socket.on('recover_error', (msg) => { document.getElementById('recover-msg').style.color = "#ed4956"; document.getElementById('recover-msg').innerText = msg; });
socket.on('recover_success', (msg) => { document.getElementById('recover-msg').style.color = "#0ea5e9"; document.getElementById('recover-msg').innerText = msg; });

function submitRecovery() {
    const email = document.getElementById('recover-email').value;
    const answer = document.getElementById('recover-answer').value;
    socket.emit('recover_password', { email: email, answer: answer });
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active-nav'));
    document.getElementById(tabName + '-tab').classList.remove('hidden');
    document.getElementById('nav-' + tabName).classList.add('active-nav');
    document.getElementById('notifications-panel').classList.add('hidden'); 
}

function openSettings() { document.getElementById('settings-modal').classList.remove('hidden'); }
function closeSettings() { document.getElementById('settings-modal').classList.add('hidden'); }

function toggleNotifications() {
    document.getElementById('notifications-panel').classList.toggle('hidden');
    document.getElementById('notif-badge').classList.add('hidden'); 
    unreadNotifs = 0;
}

socket.on('receive_notification', (data) => {
    if(data.targetEmail === currentEmail) {
        const list = document.getElementById('notif-list');
        const badge = document.getElementById('notif-badge');
        if(list.innerHTML.includes("No new notifications")) list.innerHTML = "";
        
        const pfpStyle = data.pfp ? `background-image: url(${data.pfp});` : '';
        const newItem = `
            <div class="notif-item" onclick="openProfileModal('${data.username}')">
                <div class="avatar small" style="${pfpStyle}"></div>
                <span class="notif-text"><strong>${data.username}</strong> ${data.message}</span>
            </div>
        `;
        list.innerHTML = newItem + list.innerHTML; 
        unreadNotifs++; badge.innerText = unreadNotifs; badge.classList.remove('hidden');
    }
});

function likeMedia(element, targetEmail) {
    element.classList.toggle('fa-solid'); 
    element.classList.toggle('liked');
    if(element.classList.contains('liked')) {
        socket.emit('send_like_notification', { targetEmail: targetEmail, senderEmail: currentEmail, senderUsername: currentUser, senderPfp: userPfpData });
    }
}

function openProfileModal(targetUsername) {
    document.getElementById('notifications-panel').classList.add('hidden');
    socket.emit('get_profile_data', targetUsername);
}

socket.on('receive_profile_data', (data) => {
    document.getElementById('view-profile-username').innerText = "@" + data.username;
    document.getElementById('view-profile-realname').innerText = data.username.toUpperCase();
    document.getElementById('view-stat-posts').innerText = data.postCount;
    document.getElementById('view-stat-followers').innerText = data.followers;
    document.getElementById('view-stat-following').innerText = data.following;
    if(data.pfp) document.getElementById('view-profile-pic').style.backgroundImage = `url(${data.pfp})`;
    else document.getElementById('view-profile-pic').style.backgroundImage = `none`;
    const grid = document.getElementById('view-profile-grid');
    grid.innerHTML = "";
    data.posts.forEach(media => { grid.innerHTML += `<div class="grid-item"><img src="${media}"></div>`; });
    document.getElementById('view-profile-modal').classList.remove('hidden');
});

function closeProfileModal() { document.getElementById('view-profile-modal').classList.add('hidden'); }

function executeSearch() {
    const query = document.getElementById('friend-search').value;
    socket.emit('search_users', query);
}

socket.on('search_results', (results) => {
    const list = document.getElementById('search-results-list');
    list.innerHTML = "";
    if(results.length === 0) { list.innerHTML = `<p style="padding:20px; color:#555;">No users found.</p>`; return; }
    results.forEach(user => {
        if(user.email === currentEmail) return; 
        const pfpStyle = user.pfp ? `background-image: url(${user.pfp});` : '';
        list.innerHTML += `
            <div class="search-result-item">
                <div style="display:flex; align-items:center; gap:15px; cursor:pointer;" onclick="openProfileModal('${user.username}')">
                    <div class="avatar small" style="${pfpStyle}"></div><span><strong>${user.username}</strong></span>
                </div>
                <button class="btn-follow" onclick="followUser('${user.email}', this)">Follow</button>
            </div>`;
    });
});

function followUser(targetEmail, btnElement) {
    socket.emit('follow_user', { myEmail: currentEmail, targetEmail: targetEmail });
    btnElement.innerText = "Following"; btnElement.style.background = "#262626"; btnElement.disabled = true;
}

socket.on('update_stats', (stats) => {
    document.getElementById('stat-followers').innerText = stats.followers;
    document.getElementById('stat-following').innerText = stats.following;
});

function uploadStory(event) {
    const file = event.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) { socket.emit('new_story', { user: currentUser, pfp: userPfpData, image: e.target.result }); };
    reader.readAsDataURL(file);
}

socket.on('receive_story', (data) => {
    const storyBar = document.getElementById('story-bar');
    const pfpStyle = data.pfp ? `background-image: url(${data.pfp});` : '';
    storyBar.innerHTML += `<div class="story-bubble has-story" style="${pfpStyle}" onclick="openStoryViewer('${data.user}', '${data.image}')"><p>${data.user}</p></div>`;
});

function openStoryViewer(username, imageData) {
    document.getElementById('story-modal').classList.remove('hidden');
    document.getElementById('story-image-display').src = imageData;
    document.getElementById('story-author-name').innerText = "@" + username;
    clearTimeout(storyTimeout); storyTimeout = setTimeout(closeStory, 5000);
}
function closeStory() {
    document.getElementById('story-modal').classList.add('hidden'); document.getElementById('story-image-display').src = ""; clearTimeout(storyTimeout);
}

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
    
    if(type === 'reel') {
        document.getElementById('reel-extras').classList.remove('hidden');
        document.getElementById('preview-box').style.aspectRatio = "9/16";
    } else {
        document.getElementById('reel-extras').classList.add('hidden');
        document.getElementById('preview-box').style.aspectRatio = "4/5";
    }
}

function loadGallery(event) {
    const file = event.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        currentFileData = e.target.result;
        document.getElementById('preview-icon').classList.add('hidden');
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
    if(!currentFileData) { alert("Select a photo/video first!"); return; }
    const caption = document.getElementById('post-caption').value;
    
    if(uploadMode === "post") {
        socket.emit('new_post', { email: currentEmail, user: currentUser, caption: caption, media: currentFileData, pfp: userPfpData });
        document.getElementById('my-profile-grid').innerHTML += `<div class="grid-item"><img src="${currentFileData}"></div>`;
        postCount++; document.getElementById('stat-posts').innerText = postCount;
        switchTab('feed');
    } else {
        const rTitle = document.getElementById('reel-title').value;
        const rComments = document.getElementById('reel-comments-on').checked;
        socket.emit('new_reel', { email: currentEmail, user: currentUser, caption: caption, media: currentFileData, pfp: userPfpData, title: rTitle, commentsOn: rComments });
        switchTab('reels');
    }
    
    currentFileData = null; document.getElementById('post-caption').value = ""; document.getElementById('reel-title').value = "";
    document.getElementById('image-preview').classList.add('hidden'); document.getElementById('video-preview').classList.add('hidden');
    document.getElementById('preview-icon').classList.remove('hidden');
}

socket.on('receive_post', (data) => {
    const feed = document.getElementById('feed-container');
    const pfpStyle = data.pfp ? `background-image: url(${data.pfp});` : '';
    feed.innerHTML = `
        <div class="post">
            <div class="post-header" style="cursor:pointer;" onclick="openProfileModal('${data.user}')"><div class="avatar small" style="${pfpStyle}"></div><span>${data.user}</span></div>
            <div class="post-media-container"><img src="${data.media}" class="post-real-image"></div>
            <div class="post-actions"><i class="fa-regular fa-heart action-icon" onclick="likeMedia(this, '${data.email}')"></i></div>
            <div class="post-caption"><strong>${data.user}</strong> ${data.caption}</div>
        </div>` + feed.innerHTML; 
});

socket.on('receive_reel', (data) => {
    const reelsContainer = document.getElementById('reels-container');
    const commentIcon = data.commentsOn ? `<div style="display:flex; flex-direction:column; align-items:center;"><i class="fa-regular fa-comment action-icon" onclick="alert('Comments opening soon!')"></i></div>` : '';
    const followBtn = (data.email !== currentEmail) ? `<button class="btn-follow-small" onclick="followUser('${data.email}', this)">Follow</button>` : '';

    reelsContainer.innerHTML += `
        <div class="reel-video-box">
            <video class="real-reel-vid" src="${data.media}" autoplay loop muted playsinline></video>
            <div class="reel-overlay-gradient"></div>
            
            <div class="reel-right-actions">
                <div style="display:flex; flex-direction:column; align-items:center;">
                    <i class="fa-regular fa-heart action-icon" onclick="likeMedia(this, '${data.email}')"></i>
                </div>
                ${commentIcon}
                <div style="display:flex; flex-direction:column; align-items:center;"><i class="fa-solid fa-download action-icon"></i><span class="action-label">Save</span></div>
                <div style="display:flex; flex-direction:column; align-items:center;"><i class="fa-solid fa-arrows-spin action-icon"></i><span class="action-label">Remix</span></div>
            </div>
            
            <div class="reel-bottom-info">
                <div class="reel-user-row" onclick="openProfileModal('${data.user}')">
                    <div class="avatar small" style="background-image: url(${data.pfp})"></div><span class="reel-username">@${data.user}</span>${followBtn}
                </div>
                ${data.title ? `<h4 class="reel-title">${data.title}</h4>` : ''}
                <p class="reel-desc">${data.caption}</p>
            </div>
        </div>
    `;
});
