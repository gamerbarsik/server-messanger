// @ts-nocheck

// === Инициализация звука через AudioContext ===
let audioContext = null;
let notificationBuffer = null;
let isAudioUnlocked = false;

async function initAudio() {
    if (audioContext) return;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const response = await fetch('/static/sounds/notification.mp3');
        const arrayBuffer = await response.arrayBuffer();
        notificationBuffer = await audioContext.decodeAudioData(arrayBuffer);
        isAudioUnlocked = true;
    } catch (e) {
        console.warn('Не удалось инициализировать звук:', e);
    }
}

function unlockAudio() {
    if (!isAudioUnlocked) {
        initAudio();
    }
}

document.addEventListener('click', unlockAudio, { once: true });
document.addEventListener('keydown', unlockAudio, { once: true });
document.addEventListener('touchstart', unlockAudio, { once: true });

function playNotificationSound() {
    if (!isAudioUnlocked || !notificationBuffer) return;
    try {
        const source = audioContext.createBufferSource();
        source.buffer = notificationBuffer;
        source.connect(audioContext.destination);
        source.start();
    } catch (e) {
        console.warn('Ошибка воспроизведения звука:', e);
    }
}

// === Основной код ===
document.addEventListener('DOMContentLoaded', function () {
    var user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.id || !user.username) {
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    }

    // === Глобальные переменные ===
    var currentTab = 'online';
    let currentChatUser = null;
    let lastMessageTimestamps = {};
    let unreadMessages = {};
    let friendList = [];
    let isFirstLoad = true;
    let hasShownSummary = false;

    // === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    let notificationContainer = null;

    function createNotificationContainer() {
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.className = 'notification-container';
            document.body.appendChild(notificationContainer);
        }
        return notificationContainer;
    }

    function showNotification(text, isSuccess = false) {
        const container = createNotificationContainer();
        const notification = document.createElement('div');
        notification.className = `notification ${isSuccess ? 'success' : 'error'}`;
        const icon = document.createElement('div');
        icon.className = 'notification-icon';
        icon.innerHTML = isSuccess
            ? '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M9 19.414l-6.707-6.707 1.414-1.414L9 16.586l9.293-9.293 1.414 1.414L9 19.414z"/></svg>'
            : '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
        const textEl = document.createElement('div');
        textEl.className = 'notification-text';
        textEl.textContent = text;
        const progress = document.createElement('div');
        progress.className = 'notification-progress';
        notification.appendChild(icon);
        notification.appendChild(textEl);
        notification.appendChild(progress);
        container.appendChild(notification);
        setTimeout(() => container.classList.add('show'), 10);
        setTimeout(() => {
            notification.remove();
            if (container.children.length === 0) container.classList.remove('show');
        }, 5000);
    }

    function showInfoNotification(text) {
        const container = createNotificationContainer();
        const notification = document.createElement('div');
        notification.className = 'notification info';
        const icon = document.createElement('div');
        icon.className = 'notification-icon';
        icon.innerHTML = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>';
        const textEl = document.createElement('div');
        textEl.className = 'notification-text';
        textEl.textContent = text;
        const progress = document.createElement('div');
        progress.className = 'notification-progress';
        notification.appendChild(icon);
        notification.appendChild(textEl);
        notification.appendChild(progress);
        container.appendChild(notification);
        setTimeout(() => container.classList.add('show'), 10);
        setTimeout(() => {
            notification.remove();
            if (container.children.length === 0) container.classList.remove('show');
        }, 5000);
    }

    // === ОБНОВЛЕНИЕ СЧЁТЧИКОВ ===
    function updateUnreadBadges() {
        document.querySelectorAll('.friend-item').forEach(item => {
            const userId = item.dataset.userId;
            const avatarContainer = item.querySelector('.friend-avatar-container');
            if (!userId || !avatarContainer) return;
            const oldBadge = avatarContainer.querySelector('.unread-count-badge');
            if (oldBadge) oldBadge.remove();
            if (unreadMessages[userId] > 0) {
                const badge = document.createElement('div');
                badge.className = 'unread-count-badge';
                badge.textContent = unreadMessages[userId] > 9 ? '9+' : unreadMessages[userId];
                avatarContainer.appendChild(badge);
            }
        });

        document.querySelectorAll('.member-item').forEach(item => {
            const userId = item.dataset.userId;
            const avatarContainer = item.querySelector('.member-avatar-container');
            if (!userId || !avatarContainer) return;
            const oldBadge = avatarContainer.querySelector('.unread-count-badge');
            if (oldBadge) oldBadge.remove();
            if (unreadMessages[userId] > 0) {
                const badge = document.createElement('div');
                badge.className = 'unread-count-badge';
                badge.textContent = unreadMessages[userId] > 9 ? '9+' : unreadMessages[userId];
                avatarContainer.appendChild(badge);
            }
        });
    }

    // === ЧАТ ===
    function getMoscowTime() {
        const now = new Date();
        const moscowTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));
        return moscowTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }

    function saveMessageToHistory(userId, messageData) {
        const key = `chat_history_${user.id}_${userId}`;
        let history = JSON.parse(localStorage.getItem(key) || '[]');
        if (!history.some(msg => msg.message_id === messageData.message_id)) {
            history.push(messageData);
            if (history.length > 1000) history = history.slice(-1000);
            localStorage.setItem(key, JSON.stringify(history));
        }
    }

    function loadHistoryFromStorage(userId) {
        const key = `chat_history_${user.id}_${userId}`;
        const history = JSON.parse(localStorage.getItem(key) || '[]');
        const list = document.getElementById('chatMessages');
        list.innerHTML = '';
        history.forEach(msg => {
            addMessageToChat(msg.text, msg.is_own, msg.timestamp, msg.message_id);
        });
        return history.length > 0;
    }

    function addMessageToChat(text, isOwn, timestamp = null, messageId = null) {
        if (messageId && document.querySelector(`[data-message-id="${messageId}"]`)) return;
        const div = document.createElement('div');
        div.className = `message${isOwn ? ' own' : ''}`;
        if (messageId) div.dataset.messageId = messageId;
        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        textDiv.textContent = text;
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-timestamp';
        timeDiv.textContent = timestamp || getMoscowTime();
        div.appendChild(textDiv);
        div.appendChild(timeDiv);
        document.getElementById('chatMessages').appendChild(div);
        document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight;
    }

    function openChat(userId, displayName, username, isOnline) {
        if (!userId || userId === user.id) {
            console.error('Неверный ID пользователя для чата');
            return;
        }
        currentChatUser = { id: userId, display_name: displayName, username, is_online: isOnline };
        document.getElementById('friendsList').style.display = 'none';
        document.querySelector('.friends-header').style.display = 'none';
        document.getElementById('chatContainer').style.display = 'flex';
        document.querySelector('.profile-chat-nickname').textContent = displayName;
        const statusEl = document.querySelector('.profile-chat-status');
        const indicatorEl = document.querySelector('.profile-chat-status-indicator');
        if (isOnline) {
            statusEl.textContent = 'В сети';
            statusEl.className = 'profile-chat-status';
            indicatorEl.style.background = 'var(--online)';
        } else {
            statusEl.textContent = 'Не в сети';
            statusEl.className = 'profile-chat-status offline';
            indicatorEl.style.background = 'var(--offline)';
        }
        document.querySelector('.profile-chat-avatar').textContent = displayName.charAt(0).toUpperCase();

        const hasLocalHistory = loadHistoryFromStorage(userId);

        fetch(`/api/messages/history?user1_id=${encodeURIComponent(user.id)}&user2_id=${encodeURIComponent(userId)}`)
            .then(res => res.json())
            .then(messages => {
                messages.forEach(msg => {
                    saveMessageToHistory(userId, {
                        message_id: msg.message_id,
                        text: msg.text,
                        is_own: msg.is_own,
                        timestamp: msg.timestamp
                    });
                });
                if (!hasLocalHistory) loadHistoryFromStorage(userId);
                if (messages.length > 0) {
                    const lastMsg = messages[messages.length - 1];
                    lastMessageTimestamps[userId] = lastMsg.timestamp + '_' + lastMsg.message_id;
                }
            })
            .catch(err => console.error('Ошибка загрузки истории:', err));

        if (unreadMessages[userId] > 0) {
            unreadMessages[userId] = 0;
            updateUnreadBadges();
        }
    }

    function sendMessage() {
        const text = document.getElementById('messageInput').value.trim();
        if (!text || !currentChatUser) return;
        const tempId = 'temp_' + Date.now();
        const moscowTime = getMoscowTime();
        addMessageToChat(text, true, moscowTime, tempId);
        saveMessageToHistory(currentChatUser.id, {
            message_id: tempId,
            text: text,
            is_own: true,
            timestamp: moscowTime
        });
        fetch('/api/messages/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from_user_id: user.id,
                to_user_id: currentChatUser.id,
                text: text
            })
        })
            .then(() => {
                document.getElementById('messageInput').value = '';
                loadNewMessages(currentChatUser.id);
            })
            .catch(err => {
                showNotification('Ошибка отправки', false);
                const tempMsg = document.querySelector(`[data-message-id="${tempId}"]`);
                if (tempMsg) tempMsg.remove();
            });
    }

    function loadNewMessages(userId) {
        const lastTime = lastMessageTimestamps[userId] || '';
        fetch(`/api/messages/history?user1_id=${encodeURIComponent(user.id)}&user2_id=${encodeURIComponent(userId)}`)
            .then(res => res.json())
            .then(messages => {
                const newMessages = messages.filter(msg => {
                    const msgTime = msg.timestamp + '_' + msg.message_id;
                    return msgTime > lastTime;
                });
                if (newMessages.length === 0) return;
                const lastMsg = newMessages[newMessages.length - 1];
                lastMessageTimestamps[userId] = lastMsg.timestamp + '_' + lastMsg.message_id;
                newMessages.forEach(msg => {
                    saveMessageToHistory(userId, {
                        message_id: msg.message_id,
                        text: msg.text,
                        is_own: msg.is_own,
                        timestamp: msg.timestamp
                    });
                    if (!msg.is_own) {
                        unreadMessages[userId] = (unreadMessages[userId] || 0) + 1;
                        updateUnreadBadges();
                        if (!currentChatUser || currentChatUser.id !== userId) {
                            if (!isFirstLoad) {
                                showInfoNotification(`Новое сообщение от ${msg.author_name}`);
                                playNotificationSound();
                            }
                        }
                    }
                    if (currentChatUser && currentChatUser.id === userId) {
                        addMessageToChat(msg.text, msg.is_own, msg.timestamp, msg.message_id);
                    }
                });
                if (currentChatUser && currentChatUser.id === userId && unreadMessages[userId] > 0) {
                    unreadMessages[userId] = 0;
                    updateUnreadBadges();
                }
            })
            .catch(err => console.warn('Ошибка загрузки новых сообщений:', err));
    }

    function checkAllMessages() {
        if (!user || !user.id) return;
        fetch(`/api/friends?userId=${encodeURIComponent(user.id)}`)
            .then(res => res.json())
            .then(friends => {
                let totalUnread = 0;
                friends.forEach(friend => {
                    if (friend.id === user.id) return;
                    fetch(`/api/messages/history?user1_id=${encodeURIComponent(user.id)}&user2_id=${encodeURIComponent(friend.id)}`)
                        .then(res => res.json())
                        .then(messages => {
                            const lastMsg = messages[messages.length - 1];
                            if (!lastMsg || lastMsg.is_own) return;
                            const lastTime = lastMessageTimestamps[friend.id] || '';
                            const newTime = lastMsg.timestamp + lastMsg.message_id;
                            if (newTime !== lastTime) {
                                lastMessageTimestamps[friend.id] = newTime;
                                if (!currentChatUser || currentChatUser.id !== friend.id) {
                                    unreadMessages[friend.id] = (unreadMessages[friend.id] || 0) + 1;
                                    updateUnreadBadges();
                                    totalUnread += 1;
                                    if (!isFirstLoad) {
                                        showInfoNotification(`Новое сообщение от ${friend.display_name}`);
                                        playNotificationSound();
                                    }
                                }
                            }
                        })
                        .catch(err => console.warn('Ошибка проверки сообщений:', err));
                });
                if (isFirstLoad && totalUnread > 0 && !hasShownSummary) {
                    hasShownSummary = true;
                    if (totalUnread === 1) {
                        showInfoNotification(`У вас 1 непрочитанное сообщение`);
                    } else {
                        showInfoNotification(`У вас ${totalUnread} непрочитанных сообщений!`);
                    }
                    playNotificationSound();
                }
                isFirstLoad = false;
            })
            .catch(err => console.warn('Ошибка загрузки друзей:', err));
    }

    // === ДРУЗЬЯ И ОНЛАЙН ===
    function loadOnlineUsers(query = '') {
        if (!user || !user.id) return;
        let url = '/api/online';
        if (query) url += '?q=' + encodeURIComponent(query);
        fetch(url)
            .then(res => {
                if (res.status === 401) {
                    localStorage.removeItem('user');
                    window.location.href = 'index.html';
                    return;
                }
                return res.json();
            })
            .then(users => {
                if (!users) return;
                const list = document.getElementById('onlineUsers');
                if (!list) return;
                list.innerHTML = '';
                users.forEach(u => {
                    const li = document.createElement('li');
                    li.className = 'member-item';
                    li.dataset.userId = u.id;
                    const avatarContainer = document.createElement('div');
                    avatarContainer.className = 'member-avatar-container';
                    const avatar = document.createElement('div');
                    avatar.className = 'member-avatar';
                    avatar.textContent = u.display_name.charAt(0).toUpperCase();
                    const status = document.createElement('div');
                    status.className = 'member-status' + (u.is_online ? '' : ' offline');
                    avatarContainer.appendChild(avatar);
                    avatarContainer.appendChild(status);
                    const info = document.createElement('div');
                    info.className = 'member-info';
                    const nickname = document.createElement('div');
                    nickname.className = 'member-nickname';
                    nickname.textContent = u.display_name;
                    const username = document.createElement('div');
                    username.className = 'member-username';
                    username.textContent = u.username;
                    info.appendChild(nickname);
                    info.appendChild(username);
                    li.appendChild(avatarContainer);
                    li.appendChild(info);
                    list.appendChild(li);
                });
                const countEl = document.getElementById('membersCount');
                if (countEl) countEl.textContent = 'УЧАСТНИКИ — ' + users.length;
                updateUnreadBadges();
            })
            .catch(err => console.warn('Не удалось загрузить онлайн-пользователей:', err));
    }

    function loadFriends(tab) {
        if (tab === 'pending') {
            fetch('/api/friend-requests/pending', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            })
                .then(res => {
                    if (res.status === 401) {
                        localStorage.removeItem('user');
                        window.location.href = 'index.html';
                        return;
                    }
                    return res.json();
                })
                .then(data => renderFriends(data, tab))
                .catch(err => {
                    console.error('Не удалось загрузить:', err);
                    renderFriends([], tab);
                });
        } else {
            let url = `/api/friends?userId=${encodeURIComponent(user.id)}`;
            if (tab === 'online') url += '&status=online';
            fetch(url)
                .then(res => {
                    if (res.status === 401) {
                        localStorage.removeItem('user');
                        window.location.href = 'index.html';
                        return;
                    }
                    return res.json();
                })
                .then(allUsers => {
                    let filtered = allUsers.filter(u => u.id !== user.id);
                    if (tab === 'online') filtered = filtered.filter(u => u.is_online);
                    renderFriends(filtered, tab);
                })
                .catch(err => {
                    console.error('Не удалось загрузить:', err);
                    renderFriends([], tab);
                });
        }
    }

    function searchFriends(query) {
        fetch('/api/friends/search?q=' + encodeURIComponent(query))
            .then(res => res.json())
            .then(friends => {
                let filtered = friends.filter(u => u.id !== user.id);
                renderFriends(filtered, 'all');
            })
            .catch(err => {
                console.error('Ошибка поиска:', err);
                renderFriends([], 'all');
            });
    }

    function addFriend(nickname) {
        fetch('/api/friends/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetUsername: nickname, requesterId: user.id })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showNotification(`Заявка отправлена ${nickname}!`, true);
                    loadFriends(currentTab);
                } else {
                    showNotification(data.error || 'Не удалось добавить друга', false);
                }
            })
            .catch(err => showNotification('Нет связи с сервером', false));
    }

    function acceptFriendRequest(requestId) {
        fetch('/api/friend-requests/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId: requestId, userId: user.id })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showNotification('Заявка принята!', true);
                    loadFriends('pending');
                } else {
                    showNotification(data.error || 'Ошибка', false);
                }
            });
    }

    function rejectFriendRequest(requestId) {
        fetch('/api/friend-requests/reject', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId: requestId, userId: user.id })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showNotification('Заявка отклонена', false);
                    loadFriends('pending');
                } else {
                    showNotification(data.error || 'Ошибка', false);
                }
            });
    }

    function renderFriends(data, tab) {
        const list = document.getElementById('friendsList');
        if (!list) return;
        list.innerHTML = '';
        if (!data || data.length === 0) {
            list.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">Нет пользователей</div>';
            return;
        }
        data.forEach(item => {
            let isOnline = false;
            let displayName = '';
            let username = '';
            let userId = '';
            if (item.display_name) {
                displayName = item.display_name;
                username = item.username;
                isOnline = item.is_online || false;
                userId = item.id;
            } else if (item.from_user) {
                displayName = item.from_user.display_name;
                username = item.from_user.username;
                isOnline = item.from_user.is_online || false;
                userId = item.from_user.id;
            }
            if (!displayName || !userId || userId === user.id) return;
            const friendItem = document.createElement('div');
            friendItem.className = 'friend-item';
            friendItem.dataset.userId = userId;
            const avatarContainer = document.createElement('div');
            avatarContainer.className = 'friend-avatar-container';
            const avatar = document.createElement('div');
            avatar.className = 'friend-avatar' + (isOnline ? '' : ' offline');
            avatar.textContent = displayName.charAt(0).toUpperCase();
            const status = document.createElement('div');
            status.className = 'member-status' + (isOnline ? '' : ' offline');
            avatarContainer.appendChild(avatar);
            avatarContainer.appendChild(status);
            const info = document.createElement('div');
            info.className = 'friend-info';
            const name = document.createElement('div');
            name.className = 'friend-name';
            name.textContent = displayName;
            const statusText = document.createElement('div');
            statusText.className = 'friend-status' + (isOnline ? '' : ' offline');
            statusText.textContent = isOnline ? 'В сети' : 'Не в сети';
            info.appendChild(name);
            info.appendChild(statusText);
            const actions = document.createElement('div');
            actions.className = 'friend-actions';
            if (tab === 'pending') {
                const acceptBtn = document.createElement('button');
                acceptBtn.className = 'message-btn';
                acceptBtn.style.background = '#43b581';
                acceptBtn.textContent = 'Принять';
                acceptBtn.addEventListener('click', () => acceptFriendRequest(item.id));
                const rejectBtn = document.createElement('button');
                rejectBtn.className = 'message-btn';
                rejectBtn.style.background = '#ed4245';
                rejectBtn.textContent = 'Отклонить';
                rejectBtn.addEventListener('click', () => rejectFriendRequest(item.id));
                actions.appendChild(acceptBtn);
                actions.appendChild(rejectBtn);
            } else {
                const msgBtn = document.createElement('button');
                msgBtn.className = 'message-btn';
                msgBtn.textContent = 'Написать';
                msgBtn.addEventListener('click', () => openChat(userId, displayName, username, isOnline));
                actions.appendChild(msgBtn);
            }
            friendItem.appendChild(avatarContainer);
            friendItem.appendChild(info);
            friendItem.appendChild(actions);
            list.appendChild(friendItem);
        });
        updateUnreadBadges();
    }

    // === HEARTBEAT ===
    function sendHeartbeat() {
        if (!user || !user.id) return;
        fetch('/api/heartbeat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id })
        })
            .then(() => loadOnlineUsers())
            .catch(err => console.warn('Heartbeat failed:', err));
    }

    // === ИНИЦИАЛИЗАЦИЯ ===
    document.getElementById('profile-nickname').textContent = user.display_name;
    document.getElementById('profile-username').textContent = user.username;
    const avatarText = user.display_name ? user.display_name.charAt(0).toUpperCase() : 'U';
    document.getElementById('userAvatar').textContent = avatarText;

    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('messageInput').addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    document.getElementById('backToFriendsBtn').addEventListener('click', () => {
        currentChatUser = null;
        document.getElementById('chatContainer').style.display = 'none';
        document.getElementById('friendsList').style.display = 'block';
        document.querySelector('.friends-header').style.display = 'block';
    });

    const tabButtons = document.querySelectorAll('.tab');
    tabButtons.forEach(tab => {
        tab.addEventListener('click', () => {
            tabButtons.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentTab = tab.dataset.tab;
            loadFriends(currentTab);
        });
    });

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', e => {
            const query = e.target.value.trim().toLowerCase();
            if (query === '') loadFriends(currentTab);
            else searchFriends(query);
        });
    }

    const membersSearch = document.getElementById('membersSearch');
    if (membersSearch) {
        membersSearch.addEventListener('input', e => loadOnlineUsers(e.target.value.trim()));
    }

    // Модальные окна
    const modal = document.getElementById('addFriendModal');
    const openModalBtn = document.getElementById('addFriendBtn');
    const closeModalBtn = document.getElementById('cancelAddFriend');
    const confirmBtn = document.getElementById('confirmAddFriend');
    const friendInput = document.getElementById('friendUsername');

    if (openModalBtn && modal) {
        openModalBtn.addEventListener('click', e => {
            e.preventDefault();
            friendInput.value = '';
            modal.classList.add('show');
            friendInput.focus();
        });
    }

    function closeModal() {
        if (modal) modal.classList.remove('show');
    }

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            const nickname = friendInput.value.trim();
            if (nickname && nickname.startsWith('@')) {
                addFriend(nickname);
                closeModal();
            } else {
                showNotification('Юзернейм должен начинаться с @', false);
            }
        });
    }

    document.getElementById('friendUsername').addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('confirmAddFriend').click();
        }
    });

    // Редактирование профиля
    document.getElementById('userProfile').addEventListener('click', () => {
        document.getElementById('editDisplayName').value = user.display_name;
        document.getElementById('editProfileModal').classList.add('show');
    });

    document.getElementById('saveEditProfile').addEventListener('click', () => {
        const newDisplayName = document.getElementById('editDisplayName').value.trim();
        if (!newDisplayName || newDisplayName.length < 2) {
            showNotification('Ник должен быть от 2 символов', false);
            return;
        }
        fetch('/api/profile/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, displayName: newDisplayName })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    user.display_name = newDisplayName;
                    localStorage.setItem('user', JSON.stringify(user));
                    document.getElementById('profile-nickname').textContent = newDisplayName;
                    document.getElementById('userAvatar').textContent = newDisplayName.charAt(0).toUpperCase();
                    document.getElementById('editProfileModal').classList.remove('show');
                    showNotification('Ник обновлён!', true);
                } else {
                    showNotification(data.error || 'Ошибка обновления', false);
                }
            })
            .catch(err => showNotification('Нет связи с сервером', false));
    });

    document.getElementById('cancelEditProfile').addEventListener('click', () =>
        document.getElementById('editProfileModal').classList.remove('show')
    );

    document.getElementById('editDisplayName').addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('saveEditProfile').click();
        }
    });

    // Выход
    const logoutBtn = document.getElementById('logoutBtn');
    const logoutConfirmModal = document.getElementById('logoutConfirmModal');
    const cancelLogout = document.getElementById('cancelLogout');
    const confirmLogout = document.getElementById('confirmLogout');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => logoutConfirmModal.classList.add('show'));
    }

    if (cancelLogout) {
        cancelLogout.addEventListener('click', () => logoutConfirmModal.classList.remove('show'));
    }

    if (confirmLogout) {
        confirmLogout.addEventListener('click', () => {
            fetch('/api/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            })
                .then(() => {
                    localStorage.removeItem('user');
                    window.location.href = 'index.html';
                })
                .catch(() => {
                    localStorage.removeItem('user');
                    window.location.href = 'index.html';
                });
        });
    }

    document.addEventListener('keydown', e => {
        if (logoutConfirmModal.classList.contains('show') && e.key === 'Enter') {
            e.preventDefault();
            confirmLogout.click();
        }
    });

    ['addFriendModal', 'editProfileModal', 'logoutConfirmModal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('click', e => {
                if (e.target === el) el.classList.remove('show');
            });
        }
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            ['addFriendModal', 'editProfileModal', 'logoutConfirmModal'].forEach(id => {
                const el = document.getElementById(id);
                if (el && el.classList.contains('show')) el.classList.remove('show');
            });
        }
    });

    // === МОБИЛЬНАЯ АДАПТАЦИЯ ===
    if (window.innerWidth <= 768) {
        // Создаём оверлей для правой панели
        const overlay = document.createElement('div');
        overlay.className = 'overlay';
        document.body.appendChild(overlay);

        const rightPanel = document.querySelector('.sidebar-right');

        // Свайп-логика
        let touchStartX = 0;
        let touchEndX = 0;

        document.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
        });

        document.addEventListener('touchend', e => {
            touchEndX = e.changedTouches[0].screenX;
            const diff = touchStartX - touchEndX;

            if (diff > 50 && !rightPanel.classList.contains('open')) {
                // Свайп влево → открыть
                rightPanel.classList.add('open');
                overlay.classList.add('active');
                document.body.style.overflow = 'hidden';
            } else if (diff < -50 && rightPanel.classList.contains('open')) {
                // Свайп вправо → закрыть
                rightPanel.classList.remove('open');
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });

        // Закрытие по клику на оверлей
        overlay.addEventListener('click', () => {
            rightPanel.classList.remove('open');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    }

    // Запуск
    sendHeartbeat();
    setInterval(sendHeartbeat, 30000);

    loadOnlineUsers();
    setInterval(() => loadOnlineUsers(), 5000);

    loadFriends(currentTab);

    setTimeout(() => {
        document.getElementById('friendsList').style.display = 'block';
        document.querySelector('.tabs').style.display = 'flex';
        document.querySelector('.search-box').style.display = 'flex';
    }, 100);

    setInterval(checkAllMessages, 1500);
});