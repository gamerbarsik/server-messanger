import { state } from '../core/state.js';
import { showNotification } from '../utils/notifications.js';
import { openChat } from './chat.js';
import { updateUnreadBadges } from './badges.js';

export function loadFriends(tab) {
    if (tab === 'pending') {
        fetch('/api/friend-requests/pending', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: state.user.id })
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
        let url = `/api/friends?userId=${encodeURIComponent(state.user.id)}`;
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
                let filtered = allUsers.filter(u => u.id !== state.user.id);
                if (tab === 'online') filtered = filtered.filter(u => u.is_online);
                renderFriends(filtered, tab);
            })
            .catch(err => {
                console.error('Не удалось загрузить:', err);
                renderFriends([], tab);
            });
    }
}

export function searchFriends(query) {
    fetch('/api/friends/search?q=' + encodeURIComponent(query))
        .then(res => res.json())
        .then(friends => {
            let filtered = friends.filter(u => u.id !== state.user.id);
            renderFriends(filtered, 'all');
        })
        .catch(err => {
            console.error('Ошибка поиска:', err);
            renderFriends([], 'all');
        });
}

export function addFriend(nickname) {
    fetch('/api/friends/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUsername: nickname, requesterId: state.user.id })
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showNotification(`Заявка отправлена ${nickname}!`, true);
                loadFriends(state.currentTab);
            } else {
                showNotification(data.error || 'Не удалось добавить друга', false);
            }
        })
        .catch(err => showNotification('Нет связи с сервером', false));
}

export function acceptFriendRequest(requestId) {
    fetch('/api/friend-requests/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: requestId, userId: state.user.id })
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

export function rejectFriendRequest(requestId) {
    fetch('/api/friend-requests/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: requestId, userId: state.user.id })
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

export function renderFriends(data, tab) {
    const list = document.getElementById('friendsList');
    if (!list) return;
    list.innerHTML = '';
    if (!data || data.length === 0) {
        list.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 20px;">Нет пользователей</div>';
        return;
    }
    for (let i = 0; i < data.length; i++) {
        const item = data[i];
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
        if (!displayName || !userId || userId === state.user.id) continue;
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
    }
    updateUnreadBadges();
}

// Онлайн-пользователи
export function loadOnlineUsers(query = '') {
    if (!state.user || !state.user.id) return;
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
            for (let i = 0; i < users.length; i++) {
                const u = users[i];
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
            }
            const countEl = document.getElementById('membersCount');
            if (countEl) countEl.textContent = 'УЧАСТНИКИ — ' + users.length;
            updateUnreadBadges();
        })
        .catch(err => console.warn('Не удалось загрузить онлайн-пользователей:', err));
}